import { InputJsonObject } from "@prisma/client/runtime/library";
import express, { type Request, type Response, type Router } from "express";
import { StatusCodes } from "http-status-codes";
import webPush from "web-push";
import { prisma } from "../../index";
import { authenticated } from "../../middlewares/authenticated";
import { env } from "../../utils/env";
import { handleServiceResponse } from "../../utils/httpHandlers";
import logger from "../../utils/loggers";
import { ServiceResponse } from "../../utils/serviceResponse";
import { sendNotification } from "../../utils/webpush";

export const pushRouter: Router = express.Router();

webPush.setVapidDetails("mailto:honza007cz@hotmail.com", env.VITE_VAPID_PUBLIC, env.VAPID_PRIVATE);

// Endpoint pro přijetí subscription od klienta
pushRouter.post("/subscribe", authenticated, async (req: Request, res: Response) => {
  req.session.user = req.session.user!;

  const subscription = req.body;

  logger.webpush.info(`Subscription received from ${req.session.user.username}.`);

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
  handleServiceResponse(serviceResponse, res);
  return;
});

// Endpoint pro odeslání notifikace
pushRouter.post("/send-notification", (req: Request, res: Response) => {
  // check if user loggedIn
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("Uživatel není přihlášen.", false, StatusCodes.UNAUTHORIZED);
    handleServiceResponse(serviceResponse, res);
    return;
  }

  const notificationPayload = {
    title: "Testovací notifikace",
    body: "Toto je testovací notifikace.",
    icon: "/demirel-icon.webp",
    badge: "/demirel-icon.webp",
    renotify: true,
    tag: "test-notification",
  } as NotificationProps;

  // Získání všech subscriptions uživatele
  sendNotification(req.session.user.username, notificationPayload).then(() => {
    const serviceResponse = ServiceResponse.success("Notification sent.", true, StatusCodes.OK);
    handleServiceResponse(serviceResponse, res);
    return;
  });
});
