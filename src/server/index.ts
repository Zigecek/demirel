import { env } from "./common/utils/envConfig";
import { app, logger, sessionDBaccess } from "./server";
import { Server } from "socket.io";
import ws from "./ws-server";
import "./mqtt-client";
import { PrismaClient } from "@prisma/client";
import ViteExpress from "vite-express";
import { endClient } from "./mqtt-client";
import { createDailyStats } from "./common/utils/services/daily";
import { onEachDay } from "./common/utils/onEachDay";
import { start } from "./common/utils/services/rules";

export enum Status {
  RUNNING,
  OFFLINE,
  ERROR,
}

export const status = {
  ws: Status.OFFLINE,
  mqtt: Status.OFFLINE,
  db: Status.OFFLINE,
  vite: Status.OFFLINE,
  sessionStorage: Status.OFFLINE,
};

export const prisma = new PrismaClient({
  //log: ["query", "info", "warn", "error"],
});

prisma
  .$connect()
  .then(async () => {
    logger.info("Prisma: Connected.");
    status.db = Status.RUNNING;
    start();

    //await createDailyStats("all", "all");

    // schedule daily stats creation
    onEachDay(() => {
      createDailyStats("all", "all");
    });
  })
  .catch((e) => {
    logger.error(`Prisma: Connection failed: ${e}`);
    status.db = Status.ERROR;
    onCloseSignal();
  });

ViteExpress.config({
  mode: (env.NODE_ENV as "development" | "production" | undefined) ?? "development",
});

export const server = ViteExpress.listen(app, env.PORT, () => {
  const { NODE_ENV, HOST, PORT } = env;
  logger.info(`VITE: Started ${NODE_ENV} on http://${HOST}:${PORT}`);
  status.vite = Status.RUNNING;
});
server.on("error", (e) => {
  logger.error(`VITE: Error: ${e}`);
  status.vite = Status.ERROR;

  // Try to close the server
  server.close(() => {
    logger.info("VITE: Server closed.");
    onCloseSignal();
  });
});

export const io = new Server(server, {
  transports: ["websocket", "polling", "webtransport"],
  allowEIO3: true,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

if (env.NODE_ENV === "development") {
  io.engine.on("connection_error", (err) => {
    console.log(err.req); // the request object
    console.log(err.code); // the error code, for example 1
    console.log(err.message); // the error message, for example "Session ID unknown"
    console.log(err.context); // some additional error context
    status.ws = Status.ERROR;
    onCloseSignal();
  });
}

ws(io);

export const onCloseSignal = async () => {
  logger.info("System: Closing server...");
  prisma.$disconnect();
  Promise.all([io.close(), server.close(), endClient(), sessionDBaccess.end()]).then(() => {
    logger.info("System: Server closed.");
    process.exit();
  });
  setTimeout(() => process.exit(1), 3000).unref(); // Force shutdown after 10s
};

process.on("SIGINT", onCloseSignal);
process.on("SIGTERM", onCloseSignal);
