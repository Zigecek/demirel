import { EventEmitter } from "eventemitter3";
import { prisma, Status, status } from "..";
import logger from "./loggers";

export const memory: Record<string, MQTTMessage> = {};
const memoryEmitter = new EventEmitter();

export const cloneMemory = () => {
  return { ...memory };
};

export const onMemoryChange = (cb: (msg: MQTTMessage) => void) => {
  memoryEmitter.on("message", cb);
};

export const offMemoryChange = (cb: (msg: MQTTMessage) => void) => {
  memoryEmitter.off("message", cb);
};

export const getFromDB = async () => {
  const latestTimestamps = await prisma.mqtt.groupBy({
    by: ["topic"],
    _max: {
      timestamp: true,
    },
  });

  const filters = latestTimestamps
    .filter(({ _max }) => _max.timestamp !== null)
    .map(({ topic, _max }) => ({
      topic,
      timestamp: _max.timestamp as Date,
    }));

  const messages = await prisma.mqtt.findMany({
    where: {
      OR: filters,
    },
  });

  return messages;
};

export const loadMemory = async () => {
  // load memory from db
  const firstVals = (await getFromDB()) as MQTTMessageID[];
  firstVals.forEach((msg) => {
    memory[msg.topic] = msg;
  });
  console.log("Memory loaded from DB. ", JSON.stringify(memory));
};

export const addMessage = async (message: MQTTMessage) => {
  // add message to memory
  memory[message.topic] = message;
  memoryEmitter.emit("message", message);
};

export const start = async () => {
  await loadMemory();
  logger.memory.info("Memory loaded.");
  status.memory = Status.RUNNING;
};
