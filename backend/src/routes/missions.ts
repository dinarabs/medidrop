import express from "express";
import {
  startMission,
  getMissionStatus,
  getAllMissions,
} from "../logic/simulator";

const router = express.Router();

router.post("/", (req, res) => {
  const { destination } = req.body;
  const mission = startMission(destination);
  res.status(201).json(mission);
});

router.get("/:id", (req, res) => {
  const mission = getMissionStatus(req.params.id);
  if (!mission) return res.status(404).json({ error: "Mission not found" });
  res.json(mission);
});

router.get("/", (_req, res) => {
  const all = getAllMissions();
  res.json(all);
});

export default router;
