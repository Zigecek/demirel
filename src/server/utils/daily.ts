import { Prisma } from "@prisma/client";
import { prisma } from "..";
import { calculateStats, getDayDates } from "../../globals/daily";
import logger from "./loggers";

export async function createDailyStats(topic: string | "all" = "all", date: Date | "all" = "all") {
  logger.daily.info("Creating daily stats: " + topic + " - " + date);
  // restrict the messages to the topic and date
  let where: Prisma.mqttWhereInput = {};
  if (topic !== "all") {
    where = { topic };
  }
  if (date !== "all") {
    const { start, end } = getDayDates(date);
    logger.daily.info("Start: " + start + " End: " + end);
    where = { ...where, timestamp: { gte: start, lte: end } };
  } else {
    // not today
    const { start } = getDayDates(new Date());
    where = { ...where, timestamp: { lt: start } };
  }

  logger.daily.info("Getting messages from db");

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

  logger.daily.info("Got messages from db");

  if (messages.length === 0) {
    return;
  }

  // go through the messages and create daily stats (group the message by day and calculate the stats)
  const dailyStats: dailyStats[] = [];

  const dbDaily = await prisma.daily.findMany({});

  logger.daily.info("Calculating daily stats");

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
  logger.daily.info("Saving daily stats to db");
  // create many
  await prisma.daily.createMany({
    data: dailyStats,
  });

  logger.daily.info("Filtering db");

  // filter db
  await prismaFilterDB();

  logger.daily.info("Daily stats saved to db");
}

export async function prismaFilterDB() {
  // run sql query to filter the db

  await prisma.$queryRaw`
    WITH ranked_daily AS (
      SELECT
        id,
        topic,
        date,
        ROW_NUMBER() OVER (
          PARTITION BY topic, date
          ORDER BY
            COALESCE("count", 0) DESC,
            COALESCE("risingCount", 0) DESC,
            COALESCE("fallingCount", 0) DESC
        ) AS row_num
      FROM daily
    )
    DELETE FROM daily
    WHERE id IN (
      SELECT id
      FROM ranked_daily
      WHERE row_num > 1
    );
  `;
}
