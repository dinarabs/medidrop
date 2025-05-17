interface Coordinates {
  lat: number;
  lon: number;
}

interface Mission {
  id: string;
  start: Coordinates;
  destination: Coordinates;
  startTime: number;
  durationMs: number;
  status: "in_progress" | "delivered" | "cancelled" | "failed";
  battery: number; // percentage
}
