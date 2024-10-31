//import cors from "cors";
import express, { type Express } from "express";
import { pino } from "pino";
import { openAPIRouter } from "./api-docs/openAPIRouter";
import { healthCheckRouter } from "./api/healthCheck/healthCheckRouter";
//import { rootRouter } from "@/api/rootRouter";
import { socketsRouter } from "./api/sockets/socketsRouter";
import { authRouter } from "./api/auth/authRouter";
//import errorHandler from "@/common/middleware/errorHandler";
//import rateLimiter from "@/common/middleware/rateLimiter";
import requestLogger from "./common/middleware/requestLogger";
//import { env } from "@/common/utils/envConfig";
import { corsMiddleware } from "./common/utils/cors";
//import { ServiceResponse } from "@/common/models/serviceResponse";
//import { handleServiceResponse } from "@/common/utils/httpHandlers";
import session from "express-session";
import "express-session";
import connectPgSimple from "connect-pg-simple";
import { env } from "./common/utils/envConfig";
import pg from "pg";
import { user } from "@prisma/client";
import ViteExpress from "vite-express";
import { mqttRouter } from "./api/mqtt/mqttRouter";

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

const sessionDBaccess = new pg.Pool({
  connectionString: env.DATABASE_URL,
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
app.use("/api", apiRouter);

// Swagger UI
app.use(openAPIRouter);

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
