// backend/src/logic/simulator.ts
import { Mission } from "../models/Mission";
import { supabase } from "../lib/supabase";
import { Server } from "socket.io";
import { getTerrainData } from "../services/terrain";
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
  let terrainAtLanding = await getTerrainData(
    mission.route[mission.route.length - 1].lat,
    mission.route[mission.route.length - 1].lon
  );

  // Update mission status
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

  // Update drone status at mission start
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
    // Calculate base position
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

    // Get current weather conditions
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

      // Update drone location
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
      const initialTerrain = await getTerrainData(
        currentPosition.lat,
        currentPosition.lon
      );
      const targetAltitude = initialTerrain.elevation + minAltitude;
      altitude += 20;
      if (altitude >= targetAltitude) {
        altitude = targetAltitude;
        phase = "cruise";
        mission.status = "in_progress";
      }
    } else if (phase === "cruise" && nextStep) {
      const terrain = await getTerrainData(
        currentPosition.lat,
        currentPosition.lon
      );
      altitude = terrain.elevation + minAltitude;
      if (progress >= 1) {
        mission.current_step++;
        if (mission.current_step === mission.route.length - 1) {
          phase = "delivery";
        }
      }
    } else if (phase === "delivery") {
      altitude -= 40;
      if (altitude <= terrainAtLanding.elevation + 2) {
        altitude = terrainAtLanding.elevation + 2;
        phase = "returning";
        mission.current_step = 0;
      }
    } else if (phase === "returning") {
      const terrain = await getTerrainData(
        currentPosition.lat,
        currentPosition.lon
      );
      altitude = terrain.elevation + minAltitude;
      if (progress >= 1) {
        mission.current_step++;
        if (mission.current_step >= mission.route.length - 1) {
          phase = "landing";
        }
      }
    } else if (phase === "landing") {
      const landingTerrain = await getTerrainData(
        currentPosition.lat,
        currentPosition.lon
      );
      altitude -= 20;
      if (altitude <= landingTerrain.elevation) {
        altitude = landingTerrain.elevation;
        mission.status = "completed";
        mission.completed_at = Date.now();

        // Update drone status to idle after mission completion
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
    }

    mission.battery = Math.max(0, mission.battery - batteryConsumptionRate);

    // Update drone battery
    if (mission.droneStatusUpdater) {
      mission.droneStatusUpdater({
        battery: mission.battery,
      });
    }

    const remainingDistance = calculateRemainingDistance();
    const estimatedTimeSec = calculateETA();

    // Update mission state in Supabase
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
  };

  simulateStep();
}

interface RoutePoint {
  lat: number;
  lng: number;
  altitude: number;
}

type MissionPhase = "takeoff" | "cruise" | "delivery" | "returning" | "landing";

export class DroneSimulator {
  private io: Server;
  private missionId: string;
  private route: RoutePoint[];
  private currentStep: number = 0;
  private phase: MissionPhase = "takeoff";
  private batteryLevel: number = 100;
  private currentPosition: RoutePoint;
  private isPaused: boolean = false;
  private isAborted: boolean = false;
  private simulationInterval: NodeJS.Timeout | null = null;
  private supabaseSubscription: any = null;

  constructor(io: Server, missionId: string, route: RoutePoint[]) {
    this.io = io;
    this.missionId = missionId;
    this.route = route;
    this.currentPosition = route[0];
    this.setupSupabaseSubscription();
  }

  private setupSupabaseSubscription() {
    // Subscribe to mission changes
    this.supabaseSubscription = supabase
      .channel(`mission-${this.missionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "missions",
          filter: `id=eq.${this.missionId}`,
        },
        (payload: any) => {
          console.log("Mission updated:", payload.new);
          this.handleMissionUpdate(payload.new);
        }
      )
      .subscribe();
  }

  private handleMissionUpdate(missionData: any) {
    // Update simulation based on mission changes
    if (missionData.status === "aborted") {
      this.abort();
    } else if (missionData.status === "paused") {
      this.pause();
    } else if (missionData.status === "in_progress" && this.isPaused) {
      this.resume();
    }

    // Update route if it changed
    if (
      missionData.route &&
      JSON.stringify(missionData.route) !== JSON.stringify(this.route)
    ) {
      this.route = missionData.route;
      this.currentPosition = this.route[this.currentStep];
    }
  }

  public start() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }

    this.simulationInterval = setInterval(() => this.simulateStep(), 1000);
  }

  public stop() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    if (this.supabaseSubscription) {
      this.supabaseSubscription.unsubscribe();
    }
  }

  public pause() {
    this.isPaused = true;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    // Update mission status in database
    supabase
      .from("missions")
      .update({
        status: "paused",
      })
      .eq("id", this.missionId)
      .then(({ error }) => {
        if (error) {
          console.error("Error updating mission status:", error);
        }
      });
  }

  public resume() {
    this.isPaused = false;
    this.start();

    // Update mission status in database
    supabase
      .from("missions")
      .update({
        status: "in_progress",
      })
      .eq("id", this.missionId)
      .then(({ error }) => {
        if (error) {
          console.error("Error updating mission status:", error);
        }
      });
  }

  public abort() {
    this.isAborted = true;
    this.stop();

    // Update mission status in database
    supabase
      .from("missions")
      .update({
        status: "aborted",
        completed_at: Date.now(),
      })
      .eq("id", this.missionId)
      .then(({ error }) => {
        if (error) {
          console.error("Error updating mission status:", error);
        }
      });
  }

  private simulateStep() {
    if (this.isPaused || this.isAborted) return;

    // Update battery level
    this.batteryLevel = Math.max(0, this.batteryLevel - 0.1);

    // Update position based on current phase
    switch (this.phase) {
      case "takeoff":
        this.handleTakeoff();
        break;
      case "cruise":
        this.handleCruise();
        break;
      case "delivery":
        this.handleDelivery();
        break;
      case "returning":
        this.handleReturning();
        break;
      case "landing":
        this.handleLanding();
        break;
    }

    // Emit telemetry data
    this.emitTelemetry();
  }

  private handleTakeoff() {
    // Implementation for takeoff phase
  }

  private handleCruise() {
    // Implementation for cruise phase
  }

  private handleDelivery() {
    // Implementation for delivery phase
  }

  private handleReturning() {
    // Implementation for returning phase
  }

  private handleLanding() {
    // Implementation for landing phase
    if (this.currentPosition.altitude <= 0) {
      this.phase = "landing";
      this.stop();

      // Update mission status in database
      supabase
        .from("missions")
        .update({
          status: "completed",
          phase: "landing",
          completed_at: Date.now(),
          battery: this.batteryLevel,
          altitude: 0,
          eta: 0,
        })
        .eq("id", this.missionId)
        .then(({ error }) => {
          if (error) {
            console.error("Error updating mission status:", error);
          } else {
            console.log("Mission completed successfully");
          }
        });

      // Emit final telemetry
      this.emitTelemetry();
    }
  }

  private emitTelemetry() {
    const telemetryData = {
      missionId: this.missionId,
      phase: this.phase,
      batteryLevel: this.batteryLevel,
      position: this.currentPosition,
      currentStep: this.currentStep,
      isPaused: this.isPaused,
      isAborted: this.isAborted,
      status: this.isAborted
        ? "aborted"
        : this.isPaused
        ? "paused"
        : this.phase === "landing" && this.currentPosition.altitude <= 0
        ? "completed"
        : this.phase === "takeoff"
        ? "taking_off"
        : "in_progress",
    };

    this.io.to(this.missionId).emit("telemetry", telemetryData);

    // Update mission in database
    supabase
      .from("missions")
      .update({
        status: telemetryData.status,
        phase: this.phase,
        battery: this.batteryLevel,
        altitude: this.currentPosition.altitude,
        current_step: this.currentStep,
      })
      .eq("id", this.missionId)
      .then(({ error }) => {
        if (error) {
          console.error("Error updating mission telemetry:", error);
        }
      });
  }
}
