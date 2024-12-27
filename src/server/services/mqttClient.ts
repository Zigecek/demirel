import { MqttValueType, Prisma } from "@prisma/client";
import { type JsonValue } from "@prisma/client/runtime/library";
import { connect } from "mqtt";
import { io, prisma, Status, status } from "..";
import { env } from "../utils/env";
import logger from "../utils/loggers";
import { addMessage, getNFromDB } from "../utils/memory";

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

      const dbValuesMapTwo = new Map<string, { value: JsonValue; id: number }[]>();
      (await getNFromDB(2)).forEach((val) => {
        if (!dbValuesMapTwo.has(val.topic)) {
          dbValuesMapTwo.set(val.topic, []);
        }
        dbValuesMapTwo.get(val.topic)?.push({ value: val.value, id: val.id });
      });

      logger.db.info("Saving messages to DB");

      const updates: Array<Prisma.mqttUpdateArgs> = [];
      const inserts: Array<Prisma.mqttCreateArgs> = [];

      uniqueMessages.forEach((msg) => {
        const lastValueArray = dbValuesMapTwo.get(msg.topic);
        const lastValue = lastValueArray ? lastValueArray[0] : undefined;
        const lastValue2 = lastValueArray ? lastValueArray[1] : undefined;

        if (!lastValue || !lastValue2) {
          // Pokud neexistuje, přidej prvotní záznam, který zůstane v DB na místě
          inserts.push({
            data: {
              topic: msg.topic,
              value: msg.value,
              timestamp: new Date(msg.timestamp.getTime() - 1),
              valueType: msg.valueType,
            },
          });
        } else {
          if (lastValue?.value === msg.value || lastValue2?.value === msg.value) {
            // Pokud se hodnota nezměnila, posune tento záznam
            updates.push({
              where: { id: lastValue.id },
              data: { timestamp: msg.timestamp },
            });
            return; // IMPORTANT !
          } else if (msg.valueType === MqttValueType.BOOLEAN || (lastValue?.value === msg.value && lastValue2?.value !== msg.value)) {
            // Tento záznam zůstane v DB na místě, aby to nedělalo schody v grafu
            inserts.push({
              data: {
                topic: msg.topic,
                value: msg.value,
                timestamp: new Date(msg.timestamp.getTime() - 1),
                valueType: msg.valueType,
              },
            });

            if (msg.valueType === MqttValueType.BOOLEAN) {
              // Tento záznam zůstane v DB na místě, kvůli booleanu
              inserts.push({
                data: {
                  topic: msg.topic,
                  value: msg.value,
                  timestamp: new Date(msg.timestamp.getTime() - 2),
                  valueType: msg.valueType,
                },
              });
            }
          }
        }

        // Tento záznam se bude posouvat, pokud se hodnota nezmění
        inserts.push({
          data: {
            topic: msg.topic,
            value: msg.value,
            timestamp: msg.timestamp,
            valueType: msg.valueType,
          },
        });
      });

      const promises: Prisma.PrismaPromise<any>[] = [];

      if (inserts.length > 0) {
        logger.db.info("Inserting new values. " + inserts.length);
        promises.push(
          prisma.mqtt.createMany({
            data: inserts.map((insert) => insert.data),
            skipDuplicates: true,
          })
        );
      }

      if (updates.length > 0) {
        logger.db.info("Updating existing values. " + updates.length);
        promises.push(...updates.map((update) => prisma.mqtt.update(update)));
      }

      await prisma.$transaction(promises);
    }
  } catch (err) {
    logger.db.error("Error processing queue:" + err);
  } finally {
    logger.db.info("-- Messages saved to DB --");
    isProcessingQueue = false; // Reset the flag
  }
};

const scheduleProcessing = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer); // Reset the timer
  }

  debounceTimer = setTimeout(() => {
    processQueue(); // Process the queue after 100 ms
  }, 100);
};

//setIntervalAsync(checkQueue, mqConfig.wsInterval);

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
