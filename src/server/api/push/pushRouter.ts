import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { createApiResponse } from "../../api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "../../common/models/serviceResponse";
import { handleServiceResponse } from "../../common/utils/httpHandlers";
import { prisma } from "../../index";
import webPush from "web-push";
import { env } from "../../common/utils/envConfig";
import { InputJsonObject } from "@prisma/client/runtime/library";
import { logger } from "../../server";

export const pushRegistry = new OpenAPIRegistry();
export const pushRouter: Router = express.Router();

webPush.setVapidDetails("mailto:honza007cz@hotmail.com", env.VITE_VAPID_PUBLIC, env.VAPID_PRIVATE);

pushRegistry.registerPath({
  method: "post",
  path: "/subscribe",
  tags: ["MQTT"],
  responses: createApiResponse(z.boolean(), "Success"),
});

// Endpoint pro přijetí subscription od klienta
pushRouter.post("/subscribe", async (req: Request, res: Response) => {
  // check if user loggedIn
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("User not authenticated.", false, 401);
    return handleServiceResponse(serviceResponse, res);
  }

  const subscription = req.body;

  console.log("Subscription received:", subscription);

  console.log("User:", req.session.user.username);

  // Uložení subscription do databáze
  await prisma.webpush.create({
    data: {
      data: subscription as InputJsonObject,
      timestamp: new Date(),
      user: {
        connect: {
          username: req.session.user.username,
        },
      },
    },
  });

  const serviceResponse = ServiceResponse.success("Subscription added.", true, 201);
  return handleServiceResponse(serviceResponse, res);
});

pushRegistry.registerPath({
  method: "post",
  path: "/send-notification",
  tags: ["MQTT"],
  responses: createApiResponse(z.boolean(), "Success"),
});

// Endpoint pro odeslání notifikace
pushRouter.post("/send-notification", (req: Request, res: Response) => {
  // check if user loggedIn
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("User not authenticated.", false, 401);
    return handleServiceResponse(serviceResponse, res);
  }

  const notificationPayload = {
    title: "Test Push Notification",
    body: "This is a test message",
    icon: "https://cdn.iconscout.com/icon/free/png-256/node-js-1174925.png",
  };

  // Získání všech subscriptions uživatele
  prisma.webpush
    .findMany({
      where: {
        userId: req.session.user.username,
      },
    })
    .then((webpushes) => {
      webpushes.forEach((webpush) => {
        const data = webpush.data as unknown as PushSubscription;
        webPush
          .sendNotification(data, JSON.stringify(notificationPayload))
          .then(() => {
            logger.info("Webpush: Notified - ", data.endpoint);
          })
          .catch(async (err) => {
            if (err.statusCode === 410) {
              logger.info("Webpush: Unavailable - ", data.endpoint);
              // Smazání neplatné subscription
              await prisma.webpush
                .delete({
                  where: {
                    id: webpush.id,
                  },
                })
                .then(() => {
                  logger.info("Webpush: Removed - ", data.endpoint);
                });
            }
          });
      });
    });
});
