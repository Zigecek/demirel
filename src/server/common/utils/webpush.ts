import { prisma } from "../..";
import webPush from "web-push";
import { logger } from "../../server";
import { StatusCodes } from "http-status-codes";

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
        logger.info("Webpush: Notified - " + data.endpoint);
      })
      .catch(async (err) => {
        if (err.statusCode === StatusCodes.GONE) {
          logger.info("Webpush: Unavailable - " + data.endpoint);
          // Smazání neplatné subscription
          await prisma.webpush
            .delete({
              where: {
                id: webpush.id,
              },
            })
            .then(() => {
              logger.info("Webpush: Removed - " + data.endpoint);
            });
        }
      });
  });
};
