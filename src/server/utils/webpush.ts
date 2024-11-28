import { StatusCodes } from "http-status-codes";
import webPush from "web-push";
import { prisma } from "..";
import logger from "./loggers";

export const sendNotification = async (username: string, notificationPayload: Partial<NotificationProps>) => {
  notificationPayload = {
    badge: "/demirel-icon.webp",
    body: "Demirel",
    icon: "/demirel-icon.webp",
    lang: "CS-cz",
    tag: Math.random().toString(36).substring(7),
    renotify: true,
    requireInteraction: false,
    ...notificationPayload,
  };
  const userSubs = await prisma.webpush.findMany({
    where: {
      userId: username,
    },
  });
  userSubs.forEach((webpush) => {
    const data = webpush.data as unknown as PushSubscription;
    webPush
      .sendNotification(data, JSON.stringify(notificationPayload))
      .then(() => {
        logger.webpush.info("Webpush: Notified - " + data.endpoint);
      })
      .catch(async (err) => {
        if (err.statusCode === StatusCodes.GONE) {
          logger.webpush.info("Webpush: Unavailable - " + data.endpoint);
          // Smazání neplatné subscription
          await prisma.webpush
            .delete({
              where: {
                id: webpush.id,
              },
            })
            .then(() => {
              logger.webpush.info("Webpush: Removed - " + data.endpoint);
            });
        }
      });
  });
};
