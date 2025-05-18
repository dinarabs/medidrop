// backend/src/logic/simulator.ts
import { Mission } from "../models/Mission";
import { supabase } from "../lib/supabase";
import { Server } from "socket.io";
// import { getTerrainData } from "../services/terrain";
import { checkWeather } from "../services/weather";

function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateWindDrift(
  windSpeed: number,
  windDirection: number,
  droneSpeed: number,
  droneHeading: number
) {
  // Convert angles to radians
  const windRad = (windDirection * Math.PI) / 180;
  const headingRad = (droneHeading * Math.PI) / 180;

  const windX = windSpeed * Math.sin(windRad);
  const windY = windSpeed * Math.cos(windRad);

  const droneX = droneSpeed * Math.sin(headingRad);
  const droneY = droneSpeed * Math.cos(headingRad);

  const resultantX = droneX + windX;
  const resultantY = droneY + windY;

  const newSpeed = Math.sqrt(resultantX * resultantX + resultantY * resultantY);
  const newHeading = (Math.atan2(resultantX, resultantY) * 180) / Math.PI;

  const normalizedHeading = (newHeading + 360) % 360;

  return {
    speed: newSpeed,
    heading: normalizedHeading,
    driftX: windX,
    driftY: windY,
  };
}

function calculateHeading(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let heading = (Math.atan2(y, x) * 180) / Math.PI;
  return (heading + 360) % 360;
}

export async function simulateMission(missionId: string, io: Server) {
  const { data: mission } = await supabase
    .from("missions")
    .select("*")
    .eq("id", missionId)
    .single();

  console.log("🚀 Mission:", mission);

  if (!mission) return;

  let phase: "takeoff" | "cruise" | "delivery" | "returning" | "landing" =
    "takeoff";
  let altitude = 0;
  const droneSpeed = 50;
  const minAltitude = 50;
  const batteryConsumptionRate = 0.1;
  let currentPosition = { ...mission.route[0] };
  const takeoffTime = 10;
  const landingTime = 10;

  // let terrainAtLanding = await getTerrainData(
  //   mission.route[mission.route.length - 1].lat,
  //   mission.route[mission.route.length - 1].lon
  // );

  await supabase
    .from("missions")
    .update({
      current_step: mission.current_step,
      battery: mission.battery,
      altitude: altitude,
      phase: phase,
      eta: 0,
      status: "taking_off",
      started_at: Date.now(),
    })
    .eq("id", missionId);

  if (mission.droneStatusUpdater) {
    mission.droneStatusUpdater({
      status: "in_mission",
      location: currentPosition,
      battery: mission.battery,
    });
  }

  const interpolatePosition = (
    start: any,
    end: any,
    progress: number,
    windDrift: { driftX: number; driftY: number }
  ) => {
    const baseLat = start.lat + (end.lat - start.lat) * progress;
    const baseLon = start.lon + (end.lon - start.lon) * progress;

    const latDrift = windDrift.driftY / 111111;
    const lonDrift =
      windDrift.driftX / (111111 * Math.cos((baseLat * Math.PI) / 180));

    return {
      lat: baseLat + latDrift,
      lon: baseLon + lonDrift,
    };
  };

  const calculateTotalDistance = () => {
    let total = 0;
    for (let i = 0; i < mission.route.length - 1; i++) {
      total += getDistanceMeters(
        mission.route[i].lat,
        mission.route[i].lon,
        mission.route[i + 1].lat,
        mission.route[i + 1].lon
      );
    }
    return total;
  };

  const calculateRemainingDistance = () => {
    if (phase === "takeoff") {
      return calculateTotalDistance();
    } else if (phase === "cruise") {
      let remaining = 0;
      for (let i = mission.current_step; i < mission.route.length - 1; i++) {
        remaining += getDistanceMeters(
          mission.route[i].lat,
          mission.route[i].lon,
          mission.route[i + 1].lat,
          mission.route[i + 1].lon
        );
      }
      return remaining;
    } else if (phase === "delivery") {
      return 0;
    } else if (phase === "returning") {
      let remaining = 0;
      for (let i = mission.current_step; i < mission.route.length - 1; i++) {
        remaining += getDistanceMeters(
          mission.route[i].lat,
          mission.route[i].lon,
          mission.route[i + 1].lat,
          mission.route[i + 1].lon
        );
      }
      return remaining;
    } else if (phase === "landing") {
      return 0;
    }
    return 0;
  };

  const calculateETA = () => {
    const remainingDistance = calculateRemainingDistance();
    const flightTime = remainingDistance / droneSpeed;

    if (phase === "takeoff") {
      return flightTime + takeoffTime + landingTime;
    } else if (phase === "cruise") {
      return flightTime + landingTime;
    } else if (phase === "delivery") {
      return landingTime;
    } else if (phase === "returning") {
      return flightTime + landingTime;
    } else if (phase === "landing") {
      return 0;
    }
    return 0;
  };

  const simulateStep = async () => {
    if (!mission) return;

    const current = mission.route[mission.current_step];
    const nextStep = mission.route[mission.current_step + 1];

    const weather = await checkWeather(
      currentPosition.lat,
      currentPosition.lon
    );

    let travelTime = 1000;
    let progress = 0;
    let currentHeading = 0;

    if (nextStep) {
      currentHeading = calculateHeading(
        currentPosition.lat,
        currentPosition.lon,
        nextStep.lat,
        nextStep.lon
      );

      const windEffects = calculateWindDrift(
        weather.windSpeed,
        weather.windDirection,
        droneSpeed,
        currentHeading
      );

      const distance = getDistanceMeters(
        current.lat,
        current.lon,
        nextStep.lat,
        nextStep.lon
      );

      travelTime = (distance / windEffects.speed) * 1000; // in ms
      progress = Math.min(1, (Date.now() - mission.started_at) / travelTime);

      currentPosition = interpolatePosition(current, nextStep, progress, {
        driftX: windEffects.driftX,
        driftY: windEffects.driftY,
      });

      if (mission.droneStatusUpdater) {
        mission.droneStatusUpdater({
          location: currentPosition,
        });
      }
    }

    if (mission.status === "cancelled" && phase !== "returning") {
      phase = "returning";
      mission.current_step = 0;
    }

    if (phase === "takeoff") {
      // const initialTerrain = await getTerrainData(currentPosition.lat, currentPosition.lon);
      const targetAltitude = minAltitude;
      altitude += 20;
      if (altitude >= targetAltitude) {
        altitude = targetAltitude;
        phase = "cruise";
        mission.status = "in_progress";
      }
    } else if (phase === "cruise" && nextStep) {
      // const terrain = await getTerrainData(currentPosition.lat, currentPosition.lon);
      altitude = minAltitude;
      if (progress >= 1) {
        mission.current_step++;
        if (mission.current_step === mission.route.length - 1) {
          phase = "delivery";
        }
      }
    } else if (phase === "delivery") {
      altitude -= 40;
      if (altitude <= minAltitude + 2) {
        altitude = minAltitude + 2;
        phase = "returning";
        mission.current_step = 0;
      }
    } else if (phase === "returning") {
      // const terrain = await getTerrainData(currentPosition.lat, currentPosition.lon);
      altitude = minAltitude;
      if (progress >= 1) {
        mission.current_step++;
        if (mission.current_step >= mission.route.length - 1) {
          phase = "landing";
        }
      }
    } else if (phase === "landing") {
      altitude -= 20;
      if (altitude <= 0) {
        altitude = 0;
        mission.status = "completed";
        mission.completed_at = Date.now();

        if (mission.droneStatusUpdater) {
          mission.droneStatusUpdater({
            status: "idle",
            location: currentPosition,
            battery: mission.battery,
          });
        }

        io.to(missionId).emit("telemetryUpdate", {
          missionId,
          status: "completed",
          position: currentPosition,
          battery: mission.battery,
          altitude,
          phase,
          eta: 0,
          timestamp: Date.now(),
        });
        return;
      }

      mission.battery = Math.max(0, mission.battery - batteryConsumptionRate);

      if (mission.droneStatusUpdater) {
        mission.droneStatusUpdater({
          battery: mission.battery,
        });
      }

      const remainingDistance = calculateRemainingDistance();
      const estimatedTimeSec = calculateETA();

      await supabase
        .from("missions")
        .update({
          current_step: mission.current_step,
          battery: mission.battery,
          altitude: altitude,
          phase: phase,
          eta: Math.round(estimatedTimeSec),
          status: mission.status,
          completed_at: mission.status === "completed" ? Date.now() : null,
        })
        .eq("id", missionId);

      console.log(
        `[TELEMETRY] Mission ${missionId} - Phase: ${phase}, Position: (${currentPosition.lat.toFixed(
          4
        )}, ${currentPosition.lon.toFixed(
          4
        )}), Altitude: ${altitude}m, Battery: ${mission.battery.toFixed(
          1
        )}%, Distance: ${Math.round(remainingDistance)}m, ETA: ${Math.round(
          estimatedTimeSec
        )}s, Heading: ${Math.round(currentHeading)}°, Wind: ${
          weather.windSpeed
        }m/s from ${weather.windDirection}°`
      );

      io.to(missionId).emit("telemetryUpdate", {
        missionId,
        position: currentPosition,
        battery: mission.battery,
        status: mission.status,
        altitude,
        phase,
        eta: Math.round(estimatedTimeSec),
        distance: Math.round(remainingDistance),
        heading: Math.round(currentHeading),
        windSpeed: weather.windSpeed,
        windDirection: weather.windDirection,
        timestamp: Date.now(),
      });

      setTimeout(simulateStep, 1000);
    }

    simulateStep();
  };
}
