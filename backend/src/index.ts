import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { config } from "./config/env";
import { createClient } from "@supabase/supabase-js";
import droneRoutes from "./routes/drones";
import missionRoutes from "./routes/missions";

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*", // In production, replace with your frontend URL
    methods: ["GET", "POST"],
  },
});

// Initialize Supabase client
export const supabase = createClient(
  config.supabase.url as string,
  config.supabase.anonKey as string
);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/drones", droneRoutes);
app.use("/api/missions", missionRoutes);

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("joinMission", (missionId: string) => {
    socket.join(missionId);
    console.log(`Client ${socket.id} joined mission ${missionId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
