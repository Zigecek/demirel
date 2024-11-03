import { io } from "socket.io-client";
import { API_URL } from "./utils/apiUrl";
import { postSocketAuth } from "./proxy/endpoints";
//import EventEmitter from "eventemitter3";

console.log("WS: Connecting (" + API_URL + ")");

//export const socketEE = new EventEmitter();
export const socket = io(API_URL, {
  autoConnect: false,
  withCredentials: true,
  tryAllTransports: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  upgrade: true,
});

socket.on("connect", async () => {
  console.log("WS: Connected.");

  // connect socket to user session on expresse
  await postSocketAuth({
    socketId: socket.id,
  });
});

socket.on("reconnect", async () => {
  console.log("WS: Reconnected.");

  // connect socket to user session on expresse
  await postSocketAuth({
    socketId: socket.id,
  });
});