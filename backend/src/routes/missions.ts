// backend/src/routes/missions.ts
import { Router, Request, Response, RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";
import { simulateMission } from "../logic/simulator";
import { missions } from "../data/store";
import { Mission } from "../models/Mission";
import { saveMission } from "../services/missionService";
import { checkWeather } from "../services/weather";
import { supabase } from "../lib/supabase";
import { getAvailableDrones } from "../services/droneService";

const router = Router();

const startMission: RequestHandler = async (req: Request, res: Response) => {
  console.log("Received request:", {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers,
  });

  const { name, route } = req.body as {
    name: string;
    route: any[];
  };

  console.log("Route:", JSON.stringify(route, null, 2));

  const weather = await checkWeather(route[0].lat, route[0].lon);
  if (!weather.isSafe) {
    res.status(400).json({
      error: "Mission not allowed due to weather conditions",
      reason: weather.reason,
    });
    return;
  }

  if (!name || !route) {
    console.log("Missing required fields:", { name, route });
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  if (!route || route.length < 2) {
    console.log("Invalid route:", route);
    res.status(400).json({ error: "Invalid route" });
    return;
  }

  const availableDrones = await getAvailableDrones();
  console.log("Available drones:", availableDrones);
  if (!availableDrones || availableDrones.length === 0) {
    res.status(400).json({ error: "No available drones at the moment" });
    return;
  }

  const drone = availableDrones[0];

  const missionId = uuidv4();
  const newMission: Mission = {
    id: missionId,
    droneId: drone.drone_id,
    name,
    route,
    currentStep: 0,
    status: "idle",
    battery: 100,
    startedAt: Date.now(),
  };

  const savedMission = await saveMission(newMission);

  console.log("Saved mission:", savedMission);

  if (savedMission) {
    const io = req.app.get("io");
    io.to(missionId).emit("telemetryUpdate", {
      droneId: drone.drone_id,
      missionId,
      position: route[0],
      battery: 100,
      status: "started",
      timestamp: Date.now(),
    });

    simulateMission(missionId, io);

    res.status(201).json({ missionId });
  } else {
    res.status(500).json({ error: "Failed to save mission" });
  }
};

router.post("/start", startMission);

const getMission: RequestHandler = async (req: Request, res: Response) => {
  const missionId = req.params.id;

  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .eq("id", missionId)
    .single();

  if (error) {
    console.error("❌ Failed to fetch mission:", error.message);
    res.status(500).json({ error: "Failed to retrieve mission" });
    return;
  }

  if (!data) {
    res.status(404).json({ error: "Mission not found" });
    return;
  }

  res.json({
    ...data,
    altitude: data.altitude,
    phase: data.phase,
    eta: data.eta,
  });
};

router.get("/:id", getMission);

const getAllMissions: RequestHandler = async (req: Request, res: Response) => {
  const { data, error } = await supabase.from("missions").select("*");

  if (error) {
    console.error("❌ Failed to fetch missions:", error.message);
    res.status(500).json({ error: "Failed to retrieve missions" });
    return;
  }

  res.json(data);
};

router.get("/", getAllMissions);

const cancelMission: RequestHandler = async (req: Request, res: Response) => {
  const missionId = req.params.id;
  const mission = missions[missionId];

  if (!mission) {
    res.status(404).json({ error: "Mission not found" });
    return;
  }

  if (mission.status === "completed" || mission.status === "failed") {
    res.status(400).json({ error: "Mission already ended" });
    return;
  }

  mission.status = "in_progress";
  mission.phase = "returning";

  const io = req.app.get("io");
  io.to(missionId).emit("telemetryUpdate", {
    missionId,
    status: "in_progress",
    message: "Mission was cancelled, returning to base",
    timestamp: Date.now(),
  });

  await supabase
    .from("missions")
    .update({
      status: "in_progress",
      phase: "returning",
    })
    .eq("id", missionId);

  res.json({ message: "Mission cancellation initiated" });
};

router.post("/:id/cancel", cancelMission);

export default router;
