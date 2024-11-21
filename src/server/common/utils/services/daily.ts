// Service for managing daily stats from mqtt in db

import { MqttValueType } from "@prisma/client";
import { prisma } from "../../..";
import { logger } from "../../../server";

export async function createDailyStats(topic: string | "all", date: Date | "all") {
  logger.info("Daily: Creating daily stats");
  // restrict the messages to the topic and date
  let where = {};
  if (topic !== "all") {
    where = { topic };
  }
  if (date !== "all") {
    const { start, end } = getDayDates(date);
    where = { ...where, timestamp: { gte: start, lte: end } };
  } else {
    // not today 
    const { start } = getDayDates(new Date());
    where = { ...where, timestamp: { lt: start } };
  }

  // get messages from db
  let messages = (await prisma.mqtt.findMany({
    where,
    orderBy: {
      timestamp: "asc",
    },
    omit: {
      id: true,
    },
  })) as MQTTMessage[];

  if (messages.length === 0) {
    return;
  }

  // go through the messages and create daily stats (group the message by day and calculate the stats)
  const dailyStats: dailyStats[] = [];

  const dbDaily = await prisma.daily.findMany({});

  do {
    const first = messages.shift();
    if (!first) break;
    const { start: startDate, end: endDate } = getDayDates(first.timestamp);

    // subtract the messages for the day from the array
    const dayMessages = messages.filter((msg) => msg.timestamp >= startDate && msg.timestamp <= endDate);
    messages = messages.filter((x) => !dayMessages.includes(x));

    // calculate stats
    // group by topic
    const groups: MQTTMessage[][] = [];
    dayMessages.forEach((msg) => {
      const group = groups.find((g) => g[0].topic === msg.topic);
      if (group) {
        group.push(msg);
      } else {
        groups.push([msg]);
      }
    });

    // calculate stats for each group
    groups.forEach((group) => {
      if (group.length === 0) return;
      if (dbDaily.find((d) => d.topic === group[0].topic && d.date.getTime() === startDate.getTime())) return;

      const stats = calculateStats(group, startDate, endDate);
      dailyStats.push(stats);
    });
  } while (messages.length > 0);

  // save the stats to the db
  logger.info("Daily: Saving daily stats to db");
  await prisma.daily.createMany({
    data: dailyStats,
  });
  logger.info("Daily: Daily stats saved to db");
}

export function getDayDates(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function calculateStats(messages: MQTTMessage[], start: Date, end: Date) {
  // get type of values
  const valueType = messages[0].valueType;
  const topic = messages[0].topic;

  // BOOLEAN
  let uptime: number | null = null;
  let downtime: number | null = null;

  if (valueType === MqttValueType.BOOLEAN) {
    messages.unshift({
      ...messages[0],
      timestamp: start,
    });
    messages.push({
      ...messages[messages.length - 1],
      timestamp: end,
    });

    // get duration the value was true
    uptime = 0;
    downtime = 0;
    let lastUpTimestamp = null;
    let lastDownTimestamp = null;
    for (let i = 0; i < messages.length; i++) {
      // uptime
      if (messages[i].value === true && !lastUpTimestamp) {
        lastUpTimestamp = messages[i].timestamp.getTime();
        continue;
      }
      if (messages[Math.min(i + 1, messages.length - 1)].value === false && lastUpTimestamp) {
        uptime += messages[i].timestamp.getTime() - lastUpTimestamp;
        lastUpTimestamp = null;
        continue;
      }
      if (i === messages.length - 1 && messages[i].value === true && lastUpTimestamp) {
        uptime += new Date().getTime() - lastUpTimestamp;
      }

      // downtime
      if (messages[i].value === false && !lastDownTimestamp) {
        lastDownTimestamp = messages[i].timestamp.getTime();
        continue;
      }
      if (messages[Math.min(i + 1, messages.length - 1)].value === true && lastDownTimestamp) {
        downtime += messages[i].timestamp.getTime() - lastDownTimestamp;
        lastDownTimestamp = null;
        continue;
      }
      if (i === messages.length - 1 && messages[i].value === false && lastDownTimestamp) {
        downtime += new Date().getTime() - lastDownTimestamp;
      }
    }
  }

  // FLOAT
  let min: number | null = null;
  let max: number | null = null;
  let avg: number | null = null;
  let count: number | null = null;

  if (valueType === MqttValueType.FLOAT) {
    const vals = messages.map((m) => m.value as number);
    min = Math.min(...vals);
    max = Math.max(...vals);
    count = vals.length;
    avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  return {
    topic,
    valueType,
    date: start,

    uptime,
    downtime,
    min,
    max,
    avg,
    count,
  } as dailyStats;
}
