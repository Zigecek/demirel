// Service for managing daily stats from mqtt in db

import { prisma } from "../../..";
import { logger } from "../../../server";
import { getDayDates, calculateStats } from "../../../../globals/daily";
import { Prisma } from "@prisma/client";

export async function createDailyStats(topic: string | "all", date: Date | "all") {
  logger.info("Daily: Creating daily stats:", topic, date);
  // restrict the messages to the topic and date
  let where: Prisma.mqttWhereInput = {};
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