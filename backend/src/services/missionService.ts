import { supabase } from "../lib/supabase";
import { Mission } from "../models/Mission";

export async function saveMission(mission: Mission) {
  const payload = {
    id: mission.id,
    drone_id: mission.droneId,
    name: mission.name,
    route: mission.route ?? [],
    current_step: mission.currentStep ?? 0,
    status: mission.status ?? "idle",
    battery: mission.battery ?? 100,
    altitude: mission.altitude ?? 0,
    phase: mission.phase ?? null,
    eta: mission.eta ?? 0,
    started_at: mission.startedAt ?? Date.now(),
    completed_at: mission.completedAt ?? null,
    assigned_drone_id: mission.assignedDroneId ?? null,
  };

  console.log(
    "🚀 Inserting mission with payload:",
    JSON.stringify(payload, null, 2)
  );

  const { data, error } = await supabase
    .from("missions")
    .insert([payload])
    .select();

  if (error) {
    console.error("❌ Failed to save mission:");
    console.error("• Message:", error.message);
    console.error("• Details:", error.details || "No details");
    console.error("• Hint:", error.hint || "No hint");
    console.error("• Code:", error.code || "No code");
    throw error;
  }

  console.log("✅ Saved mission result:", data);
  return data;
}
