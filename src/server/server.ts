//import cors from "cors";
import express, { type Express } from "express";
import { pino } from "pino";
import { healthCheckRouter } from "./api/healthCheck/healthCheckRouter";
//import { rootRouter } from "@/api/rootRouter";
import { socketsRouter } from "./api/sockets/socketsRouter";
import { authRouter } from "./api/auth/authRouter";
//import { corsMiddleware } from "./common/utils/cors";
import session from "express-session";
import "express-session";
import connectPgSimple from "connect-pg-simple";
import { env } from "./common/utils/envConfig";
import pg from "pg";
import { user } from "@prisma/client";
import ViteExpress from "vite-express";
import { mqttRouter } from "./api/mqtt/mqttRouter";
import { pushRouter } from "./api/push/pushRouter";
import { onCloseSignal, Status, status } from ".";
import { ruleRouter } from "./api/rule/ruleRouter";

const logger = pino({ name: "api.demirel" });
const app: Express = express();

app.set("trust proxy", true);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//app.use(corsMiddleware);

declare module "express-session" {
  interface SessionData {
    user: user;
  }
}

export const sessionDBaccess = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

sessionDBaccess.on("error", (err) => {
  logger.error(`SessionStorage: ${err}`);
  status.sessionStorage = Status.ERROR;
  onCloseSignal();
});

sessionDBaccess.on("connect", () => {
  logger.info("SessionStorage: Connected.");
  status.sessionStorage = Status.RUNNING;
});

app.use(
  session({
    store: new (connectPgSimple(session))({
      pool: sessionDBaccess,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: env.SESSION_SECRET,
    name: "SID",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: true,
      secure: false,
    },
  })
);

//app.use(requestLogger);

const apiRouter = express.Router();

apiRouter.use("/health-check", healthCheckRouter);
apiRouter.use("/sockets", socketsRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/mqtt", mqttRouter);
apiRouter.use("/push", pushRouter);
apiRouter.use("/rule", ruleRouter);
app.use("/api", apiRouter);

// Secure static routes
app.get("/", (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { user } = req.session;
  if (user) {
    return next();
  } else {
    return res.redirect("/login");
  }
});

app.get("/login", (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { user } = req.session;
  if (user) {
    return res.redirect("/");
  } else {
    return next();
  }
});

// Vite Express
app.use(ViteExpress.static());

// Error handlers
//app.use(errorHandler());

export { app, logger };
