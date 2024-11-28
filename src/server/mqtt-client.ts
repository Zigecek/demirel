import { MqttValueType, Prisma } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";
import { connect } from "mqtt";
import { io, prisma, Status, status } from ".";
import { env } from "./common/utils/envConfig";
import { addMessage, getFromDB } from "./common/utils/memory";
import { logger } from "./server";

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

export const getNewClient = () => {
  return connect(`${mqConfig.url}`, {
    username: mqConfig.username,
    password: mqConfig.password,
    clientId: mqConfig.clientId,
  });
};

export const endClient = () => new Promise((resolve) => mqtt.end(false, {}, resolve));

const mqtt = getNewClient();
const checkQueue = async () => {
  if (wsQueue.length > 0) {
    const toSend = [...new Set(wsQueue)];
    wsQueue.length = 0;
    logger.info(`WS: Sending ${toSend.length} messages to WS`);
    io.to("mqtt").emit("messages", toSend);

    logger.info("WS: Messages sent to WS");
    logger.info("Prisma: Saving messages to DB");
    // rename message to value and add mqttValueType depending on the type of the message

    // Get the latest value from each topic
    const dbValuesMap = new Map<string, { value: JsonValue; id: number }>();
    (await getFromDB()).forEach((val) => {
      dbValuesMap.set(val.topic, { value: val.value, id: val.id });
    });

    // Příprava na vložení nových hodnot a aktualizace existujících
    const updates: Array<Prisma.mqttUpdateArgs> = [];
    const inserts: Array<Prisma.mqttCreateArgs> = [];

    // Filtrovat nové zprávy
    toSend.forEach((msg) => {
      const lastValue = dbValuesMap.get(msg.topic);

      if (!lastValue) {
        // Pokud neexistuje žádná poslední hodnota, přidej nový záznam
        // Pro případ nového topicu, který se má začít zaznamenávat
        // this will stay in place
        inserts.push({
          data: {
            topic: msg.topic,
            value: msg.value,
            timestamp: new Date(msg.timestamp.getTime() - 1),
            valueType: msg.valueType,
          },
        });
      } else {
        if (lastValue.value === msg.value) {
          // Pokud se hodnota nezměnila, aktualizuj timestamp
          updates.push({
            where: { id: lastValue.id },
            data: { timestamp: msg.timestamp },
          });
          return; // IMPORTANT !
        } else {
          if (msg.valueType === MqttValueType.BOOLEAN) {
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
        }
      }

      // this will be updated
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
      logger.info("Prisma: Inserting new values. " + inserts.length);
      promises.push(
        prisma.mqtt.createMany({
          data: inserts.map((insert) => insert.data),
          skipDuplicates: true,
        })
      );
    }

    // Vykonání aktualizací a vkládání v transakci
    if (updates.length > 0) {
      logger.info("Prisma: Updating existing values. " + updates.length);
      promises.push(...updates.map((update) => prisma.mqtt.update(update)));
    }

    await prisma.$transaction(promises);

    logger.info("Prisma: -- Messages saved to DB --");
  }
};

//setIntervalAsync(checkQueue, mqConfig.wsInterval);

mqtt.on("connect", () => {
  logger.info("MQTT: Connected.");
  mqtt.subscribe(mqConfig.rootTopic);
  status.mqtt = Status.RUNNING;
});

mqtt.stream.on("error", (err) => {
  logger.error("MQTT: Error: ", err.message);
});

mqtt.on("message", (topic, message) => {
  const msg: string = message.toString();
  if (!regexes.basicVal.test(topic) && !regexes.basicSet.test(topic) && !regexes.config.test(topic) && !regexes.allVals.test(topic)) {
    logger.warn("MQTT: Invalid topic in net: " + topic);
    return;
  }

  if (regexes.basicVal.test(topic) || regexes.basicSet.test(topic)) {
    const when = new Date();

    let valueType: MqttValueType;
    let val: string | number | boolean;

    if (msg === "true" || msg === "false" || msg === "1" || msg === "0") {
      valueType = MqttValueType.BOOLEAN;
      val = msg === "true" || msg === "1";
    } else if (!isNaN(parseFloat(msg))) {
      valueType = MqttValueType.FLOAT;
      // parseFloat and mathematicaly round to 1 decimal place
      val = Math.round(parseFloat(msg) * 10) / 10;
    } else {
      logger.warn("MQTT: Invalid value in net: " + msg);
      return;
    }

    if (status.db !== Status.RUNNING) return;
    if (status.ws !== Status.RUNNING) return;
    if (status.memory !== Status.RUNNING) return;

    logger.info(`MQTT: ${topic}: ${val} <${valueType}>`);

    wsQueue.push({
      topic,
      value: val,
      timestamp: when,
      valueType,
    } as MQTTMessage);
    setTimeout(checkQueue, 100);

    addMessage({ topic, value: val, timestamp: when, valueType } as MQTTMessage);
  }
});
