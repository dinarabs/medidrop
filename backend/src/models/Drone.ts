export interface Drone {
  droneId: string;
  status: "idle" | "in_mission" | "charging" | "maintenance";
  battery: number;
  location: { lat: number; lon: number };
  capabilities: { payload: number; range: number };
}
