import { useEffect, useState } from "react";
import socket from "./socket";

interface Telemetry {
  missionId: string;
  status: string;
  battery: number;
  altitude?: number;
  phase?: string;
  position?: {
    lat: number;
    lon: number;
  };
  eta?: number;
}

const DroneTracker = ({ missionId }: { missionId: string }) => {
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);

  useEffect(() => {
    socket.emit("join", missionId);

    socket.on("telemetryUpdate", (data: Telemetry) => {
      setTelemetry(data);
    });

    return () => {
      socket.emit("leave", missionId);
      socket.off("telemetryUpdate");
    };
  }, [missionId]);

  if (!telemetry) return <p>Waiting for telemetry...</p>;

  return (
    <div>
      <h2>Mission: {telemetry.missionId}</h2>
      <p>Status: {telemetry.status}</p>
      <p>Battery: {telemetry.battery?.toFixed(1)}%</p>
      <p>Altitude: {telemetry.altitude ?? "N/A"}m</p>
      <p>Phase: {telemetry.phase ?? "N/A"}</p>
      <p>
        Location: {telemetry.position?.lat}, {telemetry.position?.lon}
      </p>
      <p>ETA: {telemetry.eta ?? "N/A"}s</p>
    </div>
  );
};

export default DroneTracker;