import { Server } from "socket.io";

export function setupSocket(io: Server) {
  io.on("connection", (socket) => {
    console.log("📡 Client connected:", socket.id);

    socket.on("joinMission", (missionId: string) => {
      socket.join(missionId);
      console.log(`👁️ Joined mission room: ${missionId}`);
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });
}
