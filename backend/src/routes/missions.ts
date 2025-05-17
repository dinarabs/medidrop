// backend/src/routes/missions.ts
import { Router, Request, Response, RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";
import { simulateMission } from "../logic/simulator";
import { missions } from "../data/store";
import { Mission } from "../models/Mission";

const router = Router();

const startMission: RequestHandler = (req: Request, res: Response) => {
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
  simulateMission(missionId);

  res.status(201).json({ missionId });
};

router.post("/start", startMission);

const getMission: RequestHandler = (req: Request, res: Response) => {
  const mission = missions[req.params.id];
  if (!mission) {
    res.status(404).json({ error: "Mission not found" });
    return;
  }
  res.json(mission);
};

router.get("/:id", getMission);

export default router;
