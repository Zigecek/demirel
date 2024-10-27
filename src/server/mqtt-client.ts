import { connect } from "mqtt";
import { env } from "./common/utils/envConfig";
import { logger } from "./server";
import { io, prisma } from ".";
import { mqtt as prismaMqtt, MqttValueType, Prisma } from "@prisma/client";
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
    const toSend = [...new Set(wsQueue)];
    wsQueue.length = 0;
    logger.info(`Sending ${toSend.length} messages to WS`);
    io.to("mqtt").emit("messages", toSend);

    logger.info("Messages sent to WS, saving to DB");
    // rename message to value and add mqttValueType depending on the type of the message

    // Get the latest value from each topic
    const lastValues = await prisma.mqtt.findMany({
      select: { topic: true, value: true, id: true },
      distinct: ["topic"],
      orderBy: {
        timestamp: "desc",
      },
    });

    // Map pro poslední hodnoty
    const lastValuesMap = new Map<string, { value: JsonValue; id: number }>();
    lastValues.forEach((val) => {
      lastValuesMap.set(val.topic, { value: val.value, id: val.id });
    });

    // Příprava na vložení nových hodnot a aktualizace existujících
    const updates: Array<Prisma.mqttUpdateArgs> = [];
    const inserts: Array<Prisma.mqttCreateArgs> = [];

    // Filtrovat nové zprávy
    toSend.forEach((msg) => {
      const lastValue = lastValuesMap.get(msg.topic);

      if (lastValue) {
        if (lastValue.value === msg.value) {
          // Pokud se hodnota nezměnila, aktualizuj timestamp
          updates.push({
            where: { id: lastValue.id },
            data: { timestamp: msg.timestamp },
          });
        } else {
          if (msg.valueType === "BOOLEAN") {
            // Pokud je to BOOLEAN, přidej ještě jeden záznam s opačnou hodnotou
            inserts.push({
              data: {
                topic: msg.topic,
                value: !msg.value,
                timestamp: new Date(msg.timestamp.getTime() - 2),
                valueType: msg.valueType,
              },
            });

            inserts.push({
              data: {
                topic: msg.topic,
                value: msg.value,
                timestamp: new Date(msg.timestamp.getTime() - 1),
                valueType: msg.valueType,
              },
            });
          }

          // Pro ostatní typy hodnot přidej nový záznam
          inserts.push({
            data: {
              topic: msg.topic,
              value: msg.value,
              timestamp: msg.timestamp,
              valueType: msg.valueType,
            },
          });
        }
      } else {
        // Pokud neexistuje žádná poslední hodnota, přidej nový záznam

        inserts.push({
          data: {
            topic: msg.topic,
            value: msg.value,
            timestamp: new Date(msg.timestamp.getTime() - 1),
            valueType: "BOOLEAN",
          },
        });

        inserts.push({
          data: {
            topic: msg.topic,
            value: msg.value,
            timestamp: msg.timestamp,
            valueType: msg.valueType,
          },
        });
      }
    });

    // Vykonání aktualizací a vkládání v transakci
    await prisma.$transaction(async (transaction) => {
      if (inserts.length > 0) {
        logger.info("Inserting new values. " + inserts.length);
        await transaction.mqtt.createMany({
          data: inserts.map((insert) => insert.data),
          skipDuplicates: true,
        });
      }

      if (updates.length > 0) {
        logger.info("Updating existing values. " + updates.length);
        await Promise.all(updates.map((update) => transaction.mqtt.update(update)));
      }

      logger.info("---------------------------------------------");
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

    logger.info(`MQTT: ${topic}: ${val} <${valueType}>`);

    wsQueue.push({
      topic,
      value: val,
      timestamp: when,
      valueType,
    } as MQTTMessageNew);
    setTimeout(checkQueue, 100);
  }
});
