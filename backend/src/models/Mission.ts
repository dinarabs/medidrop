import { Drone } from "./Drone.js";

export interface Coordinates {
  lat: number;
  lon: number;
  alt?: number;
}

export type MissionStatus =
  | "idle"
  | "taking_off"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

export type MissionPhase =
  | "takeoff"
  | "cruise"
  | "delivery"
  | "returning"
  | "landing";

export interface Mission {
  id: string;
  droneId: string;
  name: string;
  route: Coordinates[];
  currentStep: number;
  status: MissionStatus;
  battery: number;
  startedAt: number;
  completedAt?: number;
  altitude?: number;
  phase?: MissionPhase;
  eta?: number;
  assignedDroneId?: string;
  droneStatusUpdater?: (update: Partial<Drone>) => void;
}
