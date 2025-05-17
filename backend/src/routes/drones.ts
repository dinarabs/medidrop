// backend/src/routes/drones.ts
import {
  Router,
  Request as ExpressRequest,
  Response as ExpressResponse,
  RequestHandler,
} from "express";

interface Drone {
  droneId: string;
  status: "idle" | "in_mission" | "charging" | "maintenance";
  battery: number;
  location: { lat: number; lon: number };
  capabilities: { payload: number; range: number };
}

const drones: Record<string, Drone> = {
  drone_001: {
    droneId: "drone_001",
    status: "idle",
    battery: 96,
    location: { lat: 52.52, lon: 13.405 },
    capabilities: { payload: 0.5, range: 10 },
  },
  drone_002: {
    droneId: "drone_002",
    status: "charging",
    battery: 40,
    location: { lat: 52.53, lon: 13.41 },
    capabilities: { payload: 1.0, range: 15 },
  },
};

const router = Router();

router.get("/", ((_req, res) => {
  res.json(Object.values(drones));
}) as RequestHandler);

router.get("/available", ((_req, res) => {
  const available = Object.values(drones).filter(
    (drone) => drone.status === "idle" && drone.battery > 50
  );
  res.json(available);
}) as RequestHandler);

router.post("/register", ((req, res) => {
  const { droneId, battery, location, capabilities } = req.body;

  if (!droneId || !location || !capabilities) {
    return res.status(400).json({ error: "Missing required drone fields" });
  }

  if (drones[droneId]) {
    return res.status(409).json({ error: "Drone already registered" });
  }

  drones[droneId] = {
    droneId,
    status: "idle",
    battery: battery ?? 100,
    location,
    capabilities,
  };

  res.status(201).json(drones[droneId]);
}) as RequestHandler);

router.put("/:droneId", ((req, res) => {
  const { droneId } = req.params;
  const updates = req.body;

  if (!drones[droneId]) {
    return res.status(404).json({ error: "Drone not found" });
  }

  drones[droneId] = {
    ...drones[droneId],
    ...updates,
    droneId,
  };

  res.json(drones[droneId]);
}) as RequestHandler);

router.delete("/:droneId", ((req, res) => {
  const { droneId } = req.params;

  if (!drones[droneId]) {
    return res.status(404).json({ error: "Drone not found" });
  }

  delete drones[droneId];
  res.status(204).send();
}) as RequestHandler);

router.post("/assign/:missionId", ((req, res) => {
  const { missionId } = req.params;
  const { payloadRequired, startLocation } = req.body;

  if (!payloadRequired || !startLocation) {
    return res.status(400).json({ error: "Missing required mission data" });
  }

  const suitableDrone = Object.values(drones).find((drone) => {
    const hasCapacity = drone.capabilities.payload >= payloadRequired;
    const isReady = drone.status === "idle" && drone.battery > 50;
    return hasCapacity && isReady;
  });

  if (!suitableDrone) {
    return res
      .status(404)
      .json({ error: "No available drone meets the requirements" });
  }

  suitableDrone.status = "in_mission";
  // Location will be updated live during simulation steps

  // link drone to mission
  const { missions } = require("../data/store");
  if (missions[missionId]) {
    missions[missionId].assignedDroneId = suitableDrone.droneId;
    missions[missionId].droneStatusUpdater = (update: Partial<Drone>) => {
      drones[suitableDrone.droneId] = {
        ...drones[suitableDrone.droneId],
        ...update,
      };

      // Ensure location, battery, and status get updated live
      if (update.status === "idle") {
        drones[suitableDrone.droneId].status = "idle";
      }
    };
  }

  res.status(200).json({ assignedDrone: suitableDrone });
}) as RequestHandler);

router.get("/assigned/:missionId", ((req, res) => {
  const { missionId } = req.params;
  const { missions } = require("../data/store");

  const mission = missions[missionId];
  if (!mission || !mission.assignedDroneId) {
    return res.status(404).json({ error: "No drone assigned to this mission" });
  }

  const drone = drones[mission.assignedDroneId];
  if (!drone) {
    return res.status(404).json({ error: "Assigned drone not found" });
  }

  res.json(drone);
}) as RequestHandler);

export default router;
