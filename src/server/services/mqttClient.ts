import { MqttValueType, Prisma } from "@prisma/client";
import { connect } from "mqtt";
import { io, prisma, Status, status } from "..";
import { env } from "../utils/env";
import logger from "../utils/loggers";
import { addMessage, cloneMemory } from "../utils/memory";

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

const queue: MQTTMessage[] = [];
let isProcessingQueue = false;
let debounceTimer: NodeJS.Timeout | null = null;

export const getNewClient = () => {
  return connect(`${mqConfig.url}`, {
    username: mqConfig.username,
    password: mqConfig.password,
    clientId: mqConfig.clientId,
  });
};

export const endClient = () => new Promise((resolve) => mqtt.end(false, {}, resolve));

const mqtt = getNewClient();

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

mqtt.on("connect", () => {
  logger.mqtt.info("Connected.");
  mqtt.subscribe(mqConfig.rootTopic);
  status.mqtt = Status.RUNNING;
});

mqtt.stream.on("error", (err) => {
  logger.mqtt.error("Error: ", err.message);
});

mqtt.on("message", (topic, message: Buffer) => {
  if (status.db !== Status.RUNNING) return;
  if (status.ws !== Status.RUNNING) return;
  if (status.memory !== Status.RUNNING) return;
  if (status.rules !== Status.RUNNING) return;
  if (status.daily !== Status.RUNNING) return;

  const msg: string = message + "";
  if (!regexes.basicVal.test(topic) && !regexes.basicSet.test(topic) && !regexes.config.test(topic) && !regexes.allVals.test(topic)) {
    logger.mqtt.warn("Invalid topic in net: " + topic);
    return;
  }

  if (regexes.basicVal.test(topic) || regexes.basicSet.test(topic)) {
    const when = new Date();

    let valueType: MqttValueType;
    let val: string | number | boolean;

    if (msg === "true" || msg === "1") {
      valueType = MqttValueType.BOOLEAN;
      val = true;
    } else if (msg === "false" || msg === "0") {
      valueType = MqttValueType.BOOLEAN;
      val = false;
    } else if (msg === "null" || msg === "-1") {
      val = "null";
      logger.mqtt.warn(`${topic}: ${val} <NULL>`);
      return;
    } else if (!isNaN(parseFloat(msg))) {
      valueType = MqttValueType.FLOAT;
      // parseFloat and mathematicaly round to 1 decimal place
      val = Math.round(parseFloat(msg) * 10) / 10;
    } else {
      logger.mqtt.warn("Invalid value in net: " + msg);
      return;
    }

    logger.mqtt.info(`${topic}: ${val} <${valueType}>`);

    queue.push({
      topic,
      value: val,
      timestamp: when,
      valueType,
    } as MQTTMessage);
    scheduleProcessing(); // Trigger processing with buffering

    addMessage({ topic, value: val, timestamp: when, valueType } as MQTTMessage);
  }
});

const processQueue = async () => {
  if (isProcessingQueue) {
    return;
  }

  isProcessingQueue = true;

  try {
    while (queue.length > 0) {
      const uniqueMessages = [...new Set(queue)];
      queue.length = 0;

      logger.ws.info(`Sending ${uniqueMessages.length} messages to WS`);
      io.to("auth").emit("messages", uniqueMessages);

      logger.ws.info("Messages sent to WS");

      //await saveToPrisma(uniqueMessages);
    }
  } catch (err) {
    logger.db.error("Error processing queue:" + err);
  } finally {
    logger.db.info("-- Messages saved to DB --");
    isProcessingQueue = false; // Reset the flag
  }
};

const saveToPrisma = async (messages: MQTTMessage[]) => {
  const mem = await cloneMemory();

  const updates: Array<Prisma.mqttUpdateArgs> = [];
  const inserts: Array<Prisma.mqttCreateArgs> = [];

  messages.forEach((msg) => {
    const lastValueArray = mem[msg.topic];
    // if memory doesnt have more than 2 values, return
    if (lastValueArray.length < 3) return;

    const lastValue = lastValueArray ? lastValueArray[1] : undefined;
    const lastValue2 = lastValueArray ? lastValueArray[2] : undefined;

    // NEW TOPIC
    if (lastValue == undefined || lastValue2 == undefined) {
      inserts.push({
        data: {
          topic: msg.topic,
          value: msg.value,
          timestamp: new Date(msg.timestamp.getTime() - 1),
          valueType: msg.valueType,
        },
      });
      return;
    }

    // FLOAT
    if (msg.valueType === MqttValueType.FLOAT) {
      // comparing new value to last two values to reduce fluctuations
      if (lastValue?.value === msg.value || lastValue2?.value === msg.value) {
        return;
      }
    }

    // BOOLEAN
    if (msg.valueType === MqttValueType.BOOLEAN) {
      // record only value changes
      if (lastValue?.value === msg.value) {
        return;
      }
      inserts.push({
        data: {
          topic: msg.topic,
          value: msg.value,
          timestamp: new Date(msg.timestamp.getTime() - 1),
          valueType: msg.valueType,
        },
      });
      inserts.push({
        data: {
          topic: msg.topic,
          value: !msg.value, // IMPORTANT !!!
          timestamp: new Date(msg.timestamp.getTime() - 2),
          valueType: msg.valueType,
        },
      });
    }

    // COMMON VALUE RECORD
    inserts.push({
      data: {
        topic: msg.topic,
        value: msg.value,
        timestamp: msg.timestamp,
        valueType: msg.valueType,
      },
    });
  });

  logger.db.info("Saving messages to DB");

  const promises: Prisma.PrismaPromise<any>[] = [];

  if (inserts.length > 0) {
    logger.db.info("Inserting new values. " + inserts.length);
    promises.push(
      prisma.mqtt.createMany({
        data: inserts.map((insert) => insert.data),
        skipDuplicates: true,
      })
    );
  } else {
    logger.db.info("No insertions.");
  }

  if (updates.length > 0) {
    logger.db.info("Updating existing values. " + updates.length);
    promises.push(...updates.map((update) => prisma.mqtt.update(update)));
  } else {
    logger.db.info("No updates.");
  }

  await prisma.$transaction(promises);
};

const scheduleProcessing = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer); // Reset the timer
  }

  debounceTimer = setTimeout(() => {
    processQueue(); // Process the queue after 100 ms
  }, 100);
};
