import { EventEmitter } from "eventemitter3";
import { prisma, Status, status } from "..";
import logger from "./loggers";

export const memory: Record<string, MQTTMessage[]> = {};
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

// get last messages from db
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

export const getNFromDB = async (n: number) => {
  const messages = await prisma.$queryRaw<(MQTTMessage & { rn: bigint })[]>`
    WITH RankedMessages AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY topic ORDER BY timestamp DESC) AS rn
      FROM mqtt
    )
    SELECT *
    FROM RankedMessages
    WHERE rn <= ${n}
    ORDER BY topic, timestamp DESC;
  `;
  return messages;
};

export const loadMemory = async () => {
  // load memory from db
  const firstVals = (await getFromDB()) as MQTTMessageID[];
  firstVals.forEach((msg) => {
    memory[msg.topic] = [msg];
  });
};

const memoryLimit = 5;

export const addMessage = async (message: MQTTMessage) => {
  // add message to memory
  if (!memory[message.topic]) {
    memory[message.topic] = [];
  }
  memory[message.topic].unshift(message);
  if (memory[message.topic].length > memoryLimit) {
    memory[message.topic].pop();
  }
  memoryEmitter.emit("message", message);
};

export const start = async () => {
  await loadMemory();
  logger.memory.info("Memory loaded.");
  status.memory = Status.RUNNING;
};
