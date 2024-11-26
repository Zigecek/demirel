import express, { type Request, type Response, type Router } from "express";
import { ServiceResponse } from "../../common/utils/serviceResponse";
import { handleServiceResponse } from "../../common/utils/httpHandlers";
import { prisma } from "../../index";
import webPush from "web-push";
import { env } from "../../common/utils/envConfig";
import { InputJsonObject } from "@prisma/client/runtime/library";
import { logger } from "../../server";
import { StatusCodes } from "http-status-codes";
import { sendNotification } from "../../common/utils/webpush";

export const pushRouter: Router = express.Router();

webPush.setVapidDetails("mailto:honza007cz@hotmail.com", env.VITE_VAPID_PUBLIC, env.VAPID_PRIVATE);

// Endpoint pro přijetí subscription od klienta
pushRouter.post("/subscribe", async (req: Request, res: Response) => {
  // check if user loggedIn
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("User not authenticated.", false, StatusCodes.UNAUTHORIZED);
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

// Endpoint pro odeslání notifikace
pushRouter.post("/send-notification", (req: Request, res: Response) => {
  // check if user loggedIn
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("User not authenticated.", false, StatusCodes.UNAUTHORIZED);
    return handleServiceResponse(serviceResponse, res);
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
    return handleServiceResponse(serviceResponse, res);
  });
});
