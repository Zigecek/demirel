import Prisma from "@prisma/client";
import { Server } from "socket.io";
import ViteExpress from "vite-express";
import { app, sessionDBaccess } from "./server";
import { createDailyStats } from "./services/daily";
import "./services/mqttClient";
import { endClient } from "./services/mqttClient";
import { connectClient, endTransceiver } from "./services/mqttTransceiver";
import { start as startPgMon } from "./services/pgMon";
import { start as startRules } from "./services/rules";
import { env } from "./utils/env";
import logger from "./utils/loggers";
import { start as startMem } from "./utils/memory";
import { onEachDay } from "./utils/schedulers";
const { PrismaClient } = Prisma;

if (env.RUNNER === "rpi") {
  connectClient();
}

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
  rules: Status.OFFLINE,
  daily: Status.OFFLINE,
  transceiver: Status.OFFLINE,
  memory: Status.OFFLINE,
  pgMon: Status.OFFLINE,
};

export const prisma = new PrismaClient({
  //log: ["query", "info", "warn", "error"],
});

prisma
  .$connect()
  .then(async () => {
    logger.db.info("Connected.");
    status.db = Status.RUNNING;
    startMem();
    startRules();
    startPgMon();

    // schedule daily stats creation
    onEachDay(() => {
      createDailyStats("all", new Date());
    });
  })
  .catch((e) => {
    logger.db.error(`Prisma: Connection failed: ${e}`);
    status.db = Status.ERROR;
    onCloseSignal();
  });

ViteExpress.config({
  mode: (env.NODE_ENV as "development" | "production" | undefined) ?? "development",
});

export const server = ViteExpress.listen(app, env.PORT, () => {
  const { NODE_ENV, HOST, PORT } = env;
  logger.vite.info(`Started ${NODE_ENV} on http://${HOST}:${PORT}`);
  status.vite = Status.RUNNING;
});
server.on("error", (e) => {
  logger.vite.error(`Error: ${e}`);
  status.vite = Status.ERROR;

  // Try to close the server
  server.close(() => {
    logger.vite.warn("Server closed.");
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

logger.ws.info("Started.");
status.ws = Status.RUNNING;

export const onCloseSignal = async () => {
  logger.system.warn("System: Closing server...");
  prisma.$disconnect();
  Promise.all([io.close(), server.close(), endClient(), endTransceiver(), sessionDBaccess.end()]).then(() => {
    logger.system.warn("System: Server closed.");
    process.exit();
  });
  setTimeout(() => process.exit(1), 3000).unref(); // Force shutdown after 10s
};

process.on("SIGINT", onCloseSignal);
process.on("SIGTERM", onCloseSignal);
