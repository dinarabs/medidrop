// backend/src/routes/missions.ts
import { Router, Request, Response, RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";
import { simulateMission } from "../logic/simulator";
import { missions } from "../data/store";
import { Mission } from "../models/Mission";

import { checkWeather } from "../services/weather";

const router = Router();

const startMission: RequestHandler = async (req: Request, res: Response) => {
  console.log("Received request:", {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers,
  });

  const { droneId, name, route } = req.body as {
    droneId: string;
    name: string;
    route: any[];
  };

  const weather = await checkWeather(route[0].lat, route[0].lon);
  if (!weather.isSafe) {
    res.status(400).json({
      error: "Mission not allowed due to weather conditions",
      reason: weather.reason,
    });
    return;
  }

  if (!droneId || !name || !route) {
    console.log("Missing required fields:", { droneId, name, route });
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  if (!route || route.length < 2) {
    console.log("Invalid route:", route);
    res.status(400).json({ error: "Invalid route" });
    return;
  }

  const missionId = uuidv4();
  const newMission: Mission = {
    id: missionId,
    droneId,
    name,
    route,
    currentStep: 0,
    status: "idle",
    battery: 100,
    startedAt: Date.now(),
  };

  missions[missionId] = newMission;

  const io = req.app.get("io");
  io.to(missionId).emit("telemetryUpdate", {
    droneId,
    missionId,
    position: route[0],
    battery: 100,
    status: "started",
    timestamp: Date.now(),
  });

  simulateMission(missionId, io);

  res.status(201).json({ missionId });
};

router.post("/start", startMission);

const getMission: RequestHandler = (req: Request, res: Response) => {
  const mission = missions[req.params.id];
  if (!mission) {
    res.status(404).json({ error: "Mission not found" });
    return;
  }

  res.json({
    ...mission,
    altitude: mission.altitude,
    phase: mission.phase,
    eta: mission.eta,
  });
};

router.get("/:id", getMission);

export default router;
