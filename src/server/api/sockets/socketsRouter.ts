import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { createApiResponse } from "../../api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "../../common/models/serviceResponse";
import { handleServiceResponse } from "../../common/utils/httpHandlers";
import { io, prisma } from "../../index";
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

  logger.info("WS: Authorizing socket: " + gotSocket?.id);

  gotSocket.join("mqtt");

  // Get the latest value from each topic
  const latestTimestamps = await prisma.mqtt.groupBy({
    by: ['topic'],
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

  const messages = await prisma.mqtt.findMany({
    where: {
      OR: filters,
    },
    omit: {
      id: true,
    }
  }) as MQTTMessage[];


  gotSocket.emit("messages", [...new Set([...messages])]);
  logger.info("WS: Socket Authenticated.");

  const serviceResponse = ServiceResponse.success("Socket Authenticated.", true);
  return handleServiceResponse(serviceResponse, res);
});
