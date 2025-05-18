import { io } from "socket.io-client";

const socket = io("https://backend-holy-paper-343.fly.dev", {
  transports: ["websocket"],
});

export default socket;