import { io } from "socket.io-client";
import { postSocketAuth } from "./proxy/endpoints";
import { API_URL } from "./utils/apiUrl";
//import EventEmitter from "eventemitter3";

console.log("Connecting (" + API_URL + ")");

//export const socketEE = new EventEmitter();
export const socket = io(API_URL, {
  autoConnect: false,
  withCredentials: true,
  tryAllTransports: false,
  transports: ["websocket"],
  reconnection: true,
  upgrade: true,
});

socket.on("connect", async () => {
  console.log("Connected.");

  // connect socket to user session on expresse
  await postSocketAuth({
    socketId: socket.id,
  });
});

socket.on("reconnect", async () => {
  console.log("Reconnected.");

  // connect socket to user session on expresse
  await postSocketAuth({
    socketId: socket.id,
  });
});
