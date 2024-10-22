import dotenv from "dotenv";
import { cleanEnv, host, port, str, testOnly } from "envalid";
import { ESModulesRunner } from "vite/runtime";

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ["development", "production"] }),
  HOST: host(),
  PORT: port(),
  SESSION_SECRET: str(),
  MQTT_URL: str(),
  MQTT_USERNAME: str(),
  MQTT_PASSWORD: str(),
  DATABASE_URL: str(),
  RUNNER: str({ choices: ["vps", "rpi", "dev"] }),
});
