import { connect } from "mqtt";
import { env } from "./common/utils/envConfig";
import { logger } from "./server";
import { io, prisma } from ".";
import { setIntervalAsync } from "set-interval-async";

export const mqConfig = {
  url: env.MQTT_URL,
  username: env.MQTT_USERNAME,
  password: env.MQTT_PASSWORD,
  rootTopic: "zige/#",
  clientId: "api-demirel-" + Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join(""),
};

const regexes = {
  basicVal: /^zige\/.+\/.+\/val$/,
  basicSet: /^zige\/.+\/.+\/set$/,
  allVals: /^zige\/.+\/val$/,
  config: /^zige\/.+\/config$/,
};

const wsQueue: MQTTMessage[] = [];
/*
const lastMessages = new Map<string, Omit<MQTTMessage, "topic">>();
export const getRetainedMessages = () => {
  return Array.from(lastMessages.entries()).map(([key, value]) => ({ topic: key, ...value }) as MQTTMessage);
};*/

export const getNewClient = () => {
  return connect(`${mqConfig.url}`, {
    username: mqConfig.username,
    password: mqConfig.password,
    clientId: mqConfig.clientId,
  });
};
const mqtt = getNewClient();
const checkQueue = async () => {
  if (wsQueue.length > 0) {
    const toSend = [...new Set(wsQueue)];
    wsQueue.length = 0;
    logger.info(`Sending ${toSend.length} messages to WS`);
    io.to("mqtt").emit("messages", toSend);

    if (env.RUNNER === "vps") {
      logger.info("Messages sent to WS, saving to DB");
      await prisma.mqtt.createMany({ data: toSend });
    }
  }
};

//setIntervalAsync(checkQueue, mqConfig.wsInterval);

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
    /*
    if (packet.retain || lastMessages.has(topic)) {
      lastMessages.set(topic, { message: message.toString(), timestamp: when });
    }*/

    wsQueue.push({ topic, message: message.toString(), timestamp: when } as MQTTMessage);
    setTimeout(checkQueue, 100);
  }
});
