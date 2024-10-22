import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { createApiResponse } from "../../api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "../../common/models/serviceResponse";
import { handleServiceResponse } from "../../common/utils/httpHandlers";
import { io, prisma } from "../../index";
//import { getRetainedMessages } from "../../mqtt-client";
import { logger } from "../../server";

export const socketsRegistry = new OpenAPIRegistry();
export const socketsRouter: Router = express.Router();

socketsRegistry.registerPath({
  method: "post",
  path: "/auth",
  tags: ["Sockets"],
  responses: createApiResponse(z.boolean(), "Success"),
});

socketsRouter.post("/auth", async (req: Request, res: Response) => {
  // Check if express session is authenticated
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("User not authenticated.", false, 401);
    return handleServiceResponse(serviceResponse, res);
  }

  const body = req.body as SocketAuth;
  if (!body.socketId) {
    const serviceResponse = ServiceResponse.failure("No socket ID provided.", false, 400);
    return handleServiceResponse(serviceResponse, res);
  }

  const gotSocket = io?.sockets.sockets.get(body.socketId);

  if (!gotSocket) {
    const serviceResponse = ServiceResponse.failure("Socket not found.", false, 404);
    return handleServiceResponse(serviceResponse, res);
  }

  // get messages from db (not older than 1 day)
  const messages = await prisma.mqtt.findMany({
    where: {
      timestamp: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).getTime(),
      },
    },
  });
  // get rid of ids
  const messagesToSend = messages.map(({ id, ...rest }) => {
    return Object.fromEntries(
      Object.entries(rest).map(([key, value]) => {
        // Convert BigInt to Number if it's a BigInt
        return [key, typeof value === "bigint" ? Number(value) : value];
      })
    );
  });

  gotSocket.join("mqtt");
  gotSocket.emit("messages", [...new Set([...messagesToSend /*, ...getRetainedMessages()*/])]);
  logger.info("Socket Authenticated.");

  const serviceResponse = ServiceResponse.success("Socket Authenticated.", true);
  return handleServiceResponse(serviceResponse, res);
});
