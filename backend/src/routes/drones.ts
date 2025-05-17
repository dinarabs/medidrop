// backend/src/routes/drones.ts
import { Router, Request, Response } from "express";
import {
  getAllDrones,
  createNewDrone,
  updateDrone,
  deleteDrone,
  getDroneById,
  getAvailableDrones,
} from "../services/droneService";

const router = Router();

router.get("/available", async (req: Request, res: Response) => {
  try {
    const drones = await getAvailableDrones();
    res.json(drones);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const drones = await getAllDrones();
    res.json(drones);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get("/id/:drone_id", async (req: Request, res: Response) => {
  try {
    const drone = await getDroneById(req.params.drone_id);
    res.json(drone);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const drone = await createNewDrone(req.body);
    res.status(201).json(drone);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.put("/id/:drone_id", async (req: Request, res: Response) => {
  try {
    const drone = await updateDrone(req.params.drone_id, req.body);
    res.json(drone);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.delete("/id/:drone_id", async (req: Request, res: Response) => {
  try {
    await deleteDrone(req.params.drone_id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
