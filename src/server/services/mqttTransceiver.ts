import { connect, MqttClient, Packet } from "mqtt";
import { Status, status } from "..";
import { env } from "../utils/env";
import logger from "../utils/loggers";

type TopicConfig = {
  device: string;
  topics: string[];
};

const topicTable: TopicConfig[] = [];

// Helper function to parse numeric values
function parseNumeric(val: string): number | string {
  const num = parseFloat(val);
  return isNaN(num) ? val : num % 1 === 0 ? Math.round(num) : num;
}

export const mqConfig = {
  url: env.MQTT_URL,
  username: env.MQTT_USERNAME,
  password: env.MQTT_PASSWORD,
  clientId: `transceiver-${Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("")}`,
};

export const getNewClient = () => {
  return connect(`${mqConfig.url}`, {
    username: mqConfig.username,
    password: mqConfig.password,
    clientId: mqConfig.clientId,
  });
};

export const endTransceiver = () => new Promise((resolve) => client?.end(false, {}, resolve));

let client: MqttClient;

export const connectClient = () => {
  client = getNewClient();

  client.on("connect", () => {
    logger.transceiver.info("TRANSCEIVER: Connected");
    status.transceiver = Status.RUNNING;
    client.subscribe("zige/#", (err) => {
      if (err) {
        logger.transceiver.error("TRANSCEIVER: Error subscribing to zige/#", err);
      } else {
        logger.transceiver.info("TRANSCEIVER: Subscribed to zige/#");
      }
    });
  });

  client.on("message", (topic, message: Buffer, packet: Packet) => {
    const payload = message.toString();

    if (topic.endsWith("/config")) {
      const parts = topic.split("/");
      if (parts.length !== 3) return;

      const device = parts[parts.length - 2];
      // Remove existing config for the device
      const existingConfigs = topicTable.filter((config) => config.device === device);
      existingConfigs.forEach((config) => {
        const index = topicTable.indexOf(config);
        if (index > -1) topicTable.splice(index, 1);
      });

      logger.transceiver.info(`TRANSCEIVER: Config saved for ${device}`);
      logger.transceiver.info(`TRANSCEIVER: Topics: ${payload}`);

      const topics = payload.split(";");
      topicTable.push({ device, topics });
    }

    if (topic.endsWith("/val")) {
      const parts = topic.split("/");
      if (parts.length !== 3) return;

      const device = parts[parts.length - 2];
      const table = topicTable.find((config) => config.device === device);

      if (!table) {
        logger.transceiver.warn(`TRANSCEIVER: No configuration found for device: ${device}`);
        return;
      }

      logger.transceiver.info(`TRANSCEIVER: Forwarding messages from ${device}`);
      const topics = table.topics;
      const values = payload.split(";").map(parseNumeric);

      logger.transceiver.info(`TRANSCEIVER: Topics: ${topics}`);
      logger.transceiver.info(`TRANSCEIVER: Values: ${values}`);

      topics.forEach((topic, index) => {
        if (values[index] !== undefined) {
          logger.transceiver.info(`TRANSCEIVER: Publishing to ${topic}: ${values[index]}`);
          client.publish(topic, String(values[index]), { qos: 0, retain: true });
        }
      });
    }
  });

  client.on("error", (err) => {
    logger.transceiver.error(`TRANSCEIVER: ${err.message}`);
  });

  client.on("close", () => {
    logger.transceiver.warn("TRANSCEIVER: Disconnected");
    status.transceiver = Status.ERROR;
  });
};
