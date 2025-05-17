// backend/src/routes/droneAssignments.ts
import { Router, Request, Response, RequestHandler } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

const getAssignedDrone: RequestHandler = async (req, res) => {
  const { missionId } = req.params;

  try {
    const { data: mission, error: missionError } = await supabase
      .from("missions")
      .select("assigned_drone_id")
      .eq("id", missionId)
      .single();

    if (missionError) throw missionError;
    if (!mission || !mission.assigned_drone_id) {
      res.status(404).json({ error: "No drone assigned to this mission" });
      return;
    }

    const { data: drone, error: droneError } = await supabase
      .from("drones")
      .select("*")
      .eq("drone_id", mission.assigned_drone_id)
      .single();

    if (droneError) throw droneError;
    if (!drone) {
      res.status(404).json({ error: "Assigned drone not found" });
      return;
    }

    res.json(drone);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

const assignDroneToMission: RequestHandler = async (req, res) => {
  const { missionId } = req.params;
  const { payloadRequired } = req.body;

  try {
    // Find a suitable drone
    const { data: drones, error } = await supabase
      .from("drones")
      .select("*")
      .eq("status", "idle")
      .gt("battery", 50);

    if (error) throw error;

    const suitableDrone = drones.find(
      (drone) => drone.capabilities.payload >= payloadRequired
    );

    if (!suitableDrone) {
      res
        .status(404)
        .json({ error: "No available drone meets the requirements" });
      return;
    }

    // Assign the drone to the mission
    await supabase
      .from("missions")
      .update({ assigned_drone_id: suitableDrone.drone_id })
      .eq("id", missionId);

    // Update drone status
    await supabase
      .from("drones")
      .update({ status: "in_mission" })
      .eq("drone_id", suitableDrone.drone_id);

    res.status(200).json({ assignedDrone: suitableDrone });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

router.get("/assigned/mission/:missionId", getAssignedDrone);
router.post("/assign/:missionId", assignDroneToMission);

export default router;
