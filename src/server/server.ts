import { user } from "@prisma/client";
import connectPgSimple from "connect-pg-simple";
import express, { type Express } from "express";
import "express-session";
import session from "express-session";
import pg from "pg";
import ViteExpress from "vite-express";
import { authRouter } from "./api/auth/authRouter";
import { healthCheckRouter } from "./api/healthCheck/healthCheckRouter";
import { mqttRouter } from "./api/mqtt/mqttRouter";
import { pushRouter } from "./api/push/pushRouter";
import { ruleRouter } from "./api/rule/ruleRouter";
import { socketsRouter } from "./api/sockets/socketsRouter";
import { env } from "./utils/env";

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

export { app };
