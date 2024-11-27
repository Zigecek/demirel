import mqtt, { IClientOptions, MqttClient, Packet } from "mqtt";
import { Status, status } from ".";
import { env } from "./common/utils/envConfig";
import { logger } from "./server";

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

const clientId = `transceiver-${Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("")}`;

const options: IClientOptions = {
  clientId: clientId,
  username: env.MQTT_USERNAME,
  password: env.MQTT_PASSWORD,
};

const client: MqttClient = mqtt.connect(`${env.MQTT_URL}`, options);

client.on("connect", () => {
  logger.info("TRANSCEIVER: Connected");
  status.transceiver = Status.RUNNING;
  client.subscribe("zige/#", (err) => {
    if (err) {
      logger.error("TRANSCEIVER: Error subscribing to zige/#", err);
    } else {
      logger.info("TRANSCEIVER: Subscribed to zige/#");
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

    logger.info(`TRANSCEIVER: Config saved for ${device}`);
    logger.info(`TRANSCEIVER: Topics: ${payload}`);

    const topics = payload.split(";");
    topicTable.push({ device, topics });
  }

  if (topic.endsWith("/val")) {
    const parts = topic.split("/");
    if (parts.length !== 3) return;

    const device = parts[parts.length - 2];
    const table = topicTable.find((config) => config.device === device);

    if (!table) {
      logger.info(`TRANSCEIVER: No configuration found for device: ${device}`);
      return;
    }

    logger.info(`TRANSCEIVER: Forwarding messages from ${device}`);
    const topics = table.topics;
    const values = payload.split(";").map(parseNumeric);

    logger.info(`TRANSCEIVER: Topics: ${topics}`);
    logger.info(`TRANSCEIVER: Values: ${values}`);

    topics.forEach((topic, index) => {
      if (values[index] !== undefined) {
        logger.info(`TRANSCEIVER: Publishing to ${topic}: ${values[index]}`);
        client.publish(topic, String(values[index]), { qos: 0, retain: true });
      }
    });
  }
});

client.on("error", (err) => {
  logger.error(`TRANSCEIVER: ${err.message}`);
});

client.on("close", () => {
  logger.info("TRANSCEIVER: Disconnected");
  status.transceiver = Status.ERROR;
});

export const endTransceiver = () => new Promise((resolve) => client.end(false, {}, resolve));
