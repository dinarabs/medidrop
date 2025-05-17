import { supabase } from "../lib/supabase";

export async function getAllDrones() {
  const { data, error } = await supabase.from("drones").select("*");
  if (error) throw error;
  return data;
}
