import Prisma from "@prisma/client";
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

// get two last messages from db
export const getTwoFromDB = async (): Promise<Prisma.mqtt[]> => {
  const query = `
    WITH RankedMessages AS (
      SELECT m.*, 
             ROW_NUMBER() OVER (PARTITION BY m.topic ORDER BY m.timestamp DESC) AS rn
      FROM mqtt m
    )
    SELECT *
    FROM RankedMessages
    WHERE rn <= 2
    ORDER BY topic ASC, timestamp DESC;
  `;

  // Execute the raw SQL query
  const messages = await prisma.$queryRawUnsafe(query);

  // Cast the result to the Prisma generated type for the mqtt model
  return messages as Prisma.mqtt[];
};

export const loadMemory = async () => {
  // load memory from db
  const firstVals = (await getFromDB()) as MQTTMessageID[];
  firstVals.forEach((msg) => {
    memory[msg.topic] = msg;
  });
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
