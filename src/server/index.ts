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

export const prisma = new PrismaClient();

prisma
  .$connect()
  .then(async () => {
    logger.info("Prisma: Connected.");

    //await createDailyStats("all", "all");

    // schedule daily stats creation
    onEachDay(() => {
      createDailyStats("all", "all");
    });
  })
  .catch((e) => {
    logger.error(`Prisma: Connection failed: ${e}`);
  });

ViteExpress.config({
  mode: (env.NODE_ENV as "development" | "production" | undefined) ?? "development",
});

export const server = ViteExpress.listen(app, env.PORT, () => {
  const { NODE_ENV, HOST, PORT } = env;
  logger.info(`Server (${NODE_ENV}) running on port http://${HOST}:${PORT}`);
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
  });
}

ws(io);

const onCloseSignal = async () => {
  logger.info("sigint received, shutting down");
  prisma.$disconnect();
  Promise.all([io.close(), server.close(), endClient(), sessionDBaccess.end()]).then(() => {
    logger.info("server closed");
    process.exit();
  });
  setTimeout(() => process.exit(1), 3000).unref(); // Force shutdown after 10s
};

process.on("SIGINT", onCloseSignal);
process.on("SIGTERM", onCloseSignal);
