import { supabase } from "../lib/supabase";

export async function getAllDrones() {
  const { data, error } = await supabase.from("drones").select("*");
  if (error) throw error;
  return data;
}

export async function createNewDrone(customFields: any = {}) {
  const { data: drones, error } = await supabase
    .from("drones")
    .select("drone_id")
    .order("drone_id", { ascending: false })
    .limit(1);

  let nextNumber = 1;
  if (drones && drones.length > 0) {
    const lastId = drones[0].drone_id;
    const match = lastId.match(/drone-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  const newDroneId = `drone-${String(nextNumber).padStart(3, "0")}`;

  const { data: newDrone, error: insertError } = await supabase
    .from("drones")
    .insert([
      {
        drone_id: newDroneId,
        status: "idle",
        battery: 100,
        location: { lat: 0, lon: 0 },
        capabilities: { payload: 2, range: 10000 },
        ...customFields,
      },
    ]);

  if (insertError) {
    console.error("Error inserting drone:", insertError);
    throw insertError;
  }
  return newDrone;
}

export async function updateDrone(
  drone_id: string,
  updates: Partial<{
    status: string;
    battery: number;
    location: any;
    capabilities: any;
  }>
) {
  const { data, error } = await supabase
    .from("drones")
    .update(updates)
    .eq("drone_id", drone_id);
  if (error) throw error;
  return data;
}

export async function deleteDrone(drone_id: string) {
  const { data, error } = await supabase
    .from("drones")
    .delete()
    .eq("drone_id", drone_id);
  if (error) throw error;
  return data;
}

export async function getDroneById(drone_id: string) {
  const { data, error } = await supabase
    .from("drones")
    .select("*")
    .eq("drone_id", drone_id)
    .single();
  if (error) throw error;
  return data;
}

export async function getAvailableDrones() {
  const { data, error } = await supabase
    .from("drones")
    .select("*")
    .eq("status", "idle")
    .gt("battery", 50);
  if (error) throw error;
  return data;
}

export async function getDronesByStatus(status: string) {
  const { data, error } = await supabase
    .from("drones")
    .select("*")
    .eq("status", status);
  if (error) throw error;
  return data;
}
