import express from "express";
import http from "http";
import { Server } from "socket.io";
import missionRoutes from "./routes/missions";
import droneRoutes from "./routes/drones";
import { setupSocket } from "./ws/socket";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// Make io accessible globally for emitters
app.set("io", io);
setupSocket(io); // setup mission tracking socket events
const port = 3002;

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use("/api/missions", missionRoutes);
app.use("/api/drones", droneRoutes);

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
