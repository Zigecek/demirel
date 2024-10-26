import { connect } from "mqtt";
import { env } from "./common/utils/envConfig";
import { logger } from "./server";
import { io, prisma } from ".";
import { mqtt as prismaMqtt, MqttValueType } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";

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

const wsQueue: MQTTMessageNew[] = [];

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
    let toSend = [...new Set(wsQueue)];
    wsQueue.length = 0;
    logger.info(`Sending ${toSend.length} messages to WS`);
    io.to("mqtt").emit("messages", toSend);

    logger.info("Messages sent to WS, saving to DB");
    // rename message to value and add mqttValueType depending on the type of the message

    // get last value from every topic
    const lastValues = await prisma.mqtt.findMany({
      select: {
        topic: true,
        value: true,
      },
      distinct: ["topic"],
      orderBy: {
        timestamp: "desc",
      },
    });

    if (lastValues.length > 0) {
      const lastValuesMap = new Map<string, JsonValue>();
      lastValues.forEach((val) => {
        lastValuesMap.set(val.topic, val.value);
      });

      toSend.forEach((msg) => {
        const lastValue = lastValuesMap.get(msg.topic);
        if (lastValue == msg.value) {
          // remove from toSend
          toSend = toSend.filter((m) => m.topic !== msg.topic);
        }
      });
    }

    await prisma.mqtt.createMany({
      data: toSend,
      skipDuplicates: true,
    });
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
  const msg: string = message.toString();
  if (!regexes.basicVal.test(topic) && !regexes.basicSet.test(topic) && !regexes.config.test(topic) && !regexes.allVals.test(topic)) {
    logger.warn("Invalid topic in net: " + topic);
    return;
  }

  if (regexes.basicVal.test(topic) || regexes.basicSet.test(topic)) {
    logger.info(`MQTT message registered: ${topic}: ${msg}`);
    const when = new Date();

    let valueType: MqttValueType = MqttValueType.STRING;
    let val: string | number | boolean = msg;

    if (msg === "true" || msg === "false" || msg === "1" || msg === "0") {
      valueType = MqttValueType.BOOLEAN;
      val = msg === "true" || msg === "1";
    } else if (!isNaN(parseFloat(msg))) {
      valueType = MqttValueType.FLOAT;
      // parseFloat and mathematicaly round to 1 decimal place
      val = Math.round(parseFloat(msg) * 10) / 10;
    }

    wsQueue.push({
      topic,
      value: val,
      timestamp: when,
      valueType,
    } as MQTTMessageNew);
    setTimeout(checkQueue, 100);
  }
});
