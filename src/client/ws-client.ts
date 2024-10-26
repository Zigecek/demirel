import { io } from "socket.io-client";
import { API_URL } from "./utils/apiUrl";
import { postSocketAuth } from "./proxy/endpoints";
import EventEmitter from "eventemitter3";

console.log("Connecting to websocket server: " + API_URL);

export const socketEE = new EventEmitter();
export const socket = io(API_URL, {
  autoConnect: false,
  withCredentials: true,
  tryAllTransports: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  upgrade: true,
});

socket.on("connect", async () => {
  console.log("Connected to websocket server");

  // connect socket to user session on expresse
  await postSocketAuth({
    socketId: socket.id,
  });
});

socket.on("reconnect", async () => {
  console.log("Reconnected to websocket server");

  // connect socket to user session on expresse
  await postSocketAuth({
    socketId: socket.id,
  });
});

socket.on("messages", (msgs: (MQTTMessageNew & { timestamp: number })[]) => {
  // bundle messages from db by topic and emit them
  const topics = new Map<string, MQTTMessageNew[]>();
  msgs.forEach((msg) => {
    if (!topics.has(msg.topic)) {
      topics.set(msg.topic, []);
    }
    topics.get(msg.topic)?.push({
      ...msg,
      timestamp: new Date(msg.timestamp),
    });
  });
  // emit messages by topic
  topics.forEach((msgs, topic) => {
    socketEE.emit(topic, msgs);
  });
  console.log(socketEE.listeners("zige/pozar1/temp/val"));
});
