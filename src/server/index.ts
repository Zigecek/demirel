import { env } from "./common/utils/envConfig";
import { app, logger } from "./server";
import { Server } from "socket.io";
import ws from "./ws-server";
import { validateOrigin } from "./common/utils/cors";
import "./mqtt-client";
import { PrismaClient } from "@prisma/client";
import ViteExpress from "vite-express";

export const prisma = new PrismaClient();

ViteExpress.config({
  mode: (env.NODE_ENV as "development" | "production" | undefined) ?? "development",
});

export const server = ViteExpress.listen(app, env.PORT, () => {
  const { NODE_ENV, HOST, PORT } = env;
  logger.info(`Server (${NODE_ENV}) running on port http://${HOST}:${PORT}`);
});

export const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      return origin ? callback(null, validateOrigin(origin)) : callback(new Error("Not allowed by CORS"), false);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

io.engine.on("connection_error", (err) => {
  console.log(err.req);      // the request object
  console.log(err.code);     // the error code, for example 1
  console.log(err.message);  // the error message, for example "Session ID unknown"
  console.log(err.context);  // some additional error context
});


ws(io);

const onCloseSignal = () => {
  logger.info("sigint received, shutting down");
  prisma.$disconnect();
  server.close(() => {
    logger.info("server closed");
    process.exit();
  });
  setTimeout(() => process.exit(1), 10000).unref(); // Force shutdown after 10s
};

process.on("SIGINT", onCloseSignal);
process.on("SIGTERM", onCloseSignal);
