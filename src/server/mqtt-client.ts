import { connect } from "mqtt";
import { env } from "./common/utils/envConfig";
import { logger } from "./server";
import { io } from ".";

export const mqConfig = {
  url: env.MQTT_URL,
  username: env.MQTT_USERNAME,
  password: env.MQTT_PASSWORD,
  rootTopic: "zige/#",
  wsInterval: 1000,
  clientId: "api-demirel-" + Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join(""),
};

const regexes = {
  basicVal: /^zige\/.+\/.+\/val$/,
  basicSet: /^zige\/.+\/.+\/set$/,
  allVals: /^zige\/.+\/val$/,
  config: /^zige\/.+\/config$/,
};

const wsQueue: MQTTMessage[] = [];
let instantSend = false;

const lastMessages = new Map<string, Omit<MQTTMessage, "topic">>();
export const getRetainedMessages = () => {
  return Array.from(lastMessages.entries()).map(([key, value]) => ({ topic: key, ...value }) as MQTTMessage);
};

export const getNewClient = () => {
  return connect(`${mqConfig.url}`, {
    username: mqConfig.username,
    password: mqConfig.password,
    clientId: mqConfig.clientId,
  });
};
const mqtt = getNewClient();
const checkQueue = () => {
  if (wsQueue.length > 0) {
    logger.info(`Sending ${wsQueue.length} messages to WS`);
    io.to("mqtt").emit("messages", wsQueue);
    wsQueue.length = 0;
  } else {
    instantSend = true;
  }
};

setInterval(checkQueue, mqConfig.wsInterval);

mqtt.on("connect", () => {
  logger.info("MQTT connected.");
  mqtt.subscribe(mqConfig.rootTopic);
});

mqtt.stream.on("error", (err) => {
  logger.error("MQTT error: ", err);
});

mqtt.on("message", (topic, message, packet) => {
  if (!regexes.basicVal.test(topic) && !regexes.basicSet.test(topic) && !regexes.config.test(topic) && !regexes.allVals.test(topic)) {
    logger.warn("Invalid topic in net: " + topic);
    return;
  }

  if (regexes.basicVal.test(topic) || regexes.basicSet.test(topic)) {
    logger.info(`MQTT message registered: ${topic}: ${message.toString()}`);
    const when = Date.now();
    if (packet.retain || lastMessages.has(topic)) {
      lastMessages.set(topic, { message: message.toString(), timestamp: when });
    }

    wsQueue.push({ topic, message: message.toString(), timestamp: when } as MQTTMessage);
    if (instantSend) {
      instantSend = false;
      setTimeout(checkQueue, 100);
    }
  }
});
