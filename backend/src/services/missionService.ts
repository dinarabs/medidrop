import { supabase } from "../lib/supabase";
import { Mission } from "../models/Mission";

export async function saveMission(mission: Mission) {
  const { error } = await supabase.from("missions").insert([
    {
      id: mission.id,
      drone_id: mission.droneId,
      name: mission.name,
      route: mission.route,
      current_step: mission.currentStep,
      status: mission.status,
      battery: mission.battery,
      altitude: mission.altitude,
      phase: mission.phase,
      eta: mission.eta,
      started_at: mission.startedAt,
      completed_at: mission.completedAt,
      assigned_drone_id: mission.assignedDroneId,
    },
  ]);

  if (error) {
    console.error("❌ Failed to save mission:", error.message);
    throw error;
  }
}
