import { Server } from "socket.io";
import { logger } from "./server.js";
import { Status, status } from "./index.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default (io: Server) => {
  logger.info("WS: Started.");
  status.ws = Status.RUNNING;
};
