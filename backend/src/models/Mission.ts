export interface Coordinates {
  lat: number;
  lon: number;
  alt?: number;
}

export type MissionStatus = "idle" | "in_progress" | "completed" | "failed";

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
}
