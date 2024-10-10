//import { z } from "zod";

type SocketAuth = {
  socketId: string | undefined;
};

type UserLogin = {
  username: string;
  password: string;
};

type MQTTMessage = {
  topic: string;
  message: string;
};
