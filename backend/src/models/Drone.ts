export interface Drone {
  drone_id: string;
  status: "idle" | "in_mission" | "charging" | "maintenance";
  battery: number;
  location: { lat: number; lon: number };
  capabilities: { payload: number; range: number };
  model?: string;
  serial_number?: string;
  health_status?: string;
  max_payload?: number;
  max_range?: number;
  firmware_version?: string;
  last_maintenance?: string; // or Date
  is_active?: boolean;
  assigned_mission_id?: string;
  created_at?: string;
}
