import { prisma } from "../..";

export const getFirstMessages = async (omit: any = { id: true }): Promise<any[]> => {
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

  const messages = (await prisma.mqtt.findMany({
    where: {
      OR: filters,
    },
    omit: omit,
  }));

  return messages;
};
