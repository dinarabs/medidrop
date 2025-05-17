import { Mission } from "../models/Mission";
import { missions } from "../data/store";

export function simulateMission(missionId: string) {
  const mission = missions[missionId];
  if (!mission) return;

  mission.status = "in_progress";
  mission.startedAt = Date.now();

  const interval = setInterval(() => {
    if (!missions[missionId]) return clearInterval(interval);

    const m = missions[missionId];
    if (m.currentStep >= m.route.length - 1) {
      m.status = "completed";
      m.completedAt = Date.now();
      return clearInterval(interval);
    }

    m.currentStep++;
    m.battery -= Math.random() * 5;
  }, 1000);
}
