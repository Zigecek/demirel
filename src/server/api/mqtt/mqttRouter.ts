import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { createApiResponse } from "../../api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "../../common/models/serviceResponse";
import { handleServiceResponse } from "../../common/utils/httpHandlers";
import { prisma } from "../../index";

export const mqttRegistry = new OpenAPIRegistry();
export const mqttRouter: Router = express.Router();

mqttRegistry.registerPath({
  method: "post",
  path: "/auth",
  tags: ["MQTT"],
  responses: createApiResponse(z.object({}), "Success"),
});

mqttRouter.post("/data", async (req: Request, res: Response) => {
  // Check if express session is authenticated
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("User not authenticated.", false, 401);
    return handleServiceResponse(serviceResponse, res);
  }

  // get request parameters
  const { start, end, topic } = req.body;
  if (!start || !end || !topic) {
    const serviceResponse = ServiceResponse.failure("No start or end time provided.", false, 400);
    return handleServiceResponse(serviceResponse, res);
  }
  const s = new Date(start);
  const e = new Date(end);
  const t = topic;
  const zoom = (e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000);

  // get all messages between start and end
  const messages = await prisma.mqtt.findMany({
    where: {
      timestamp: {
        gte: s,
        lte: e,
      },
      topic: t,
    },
    select: {
      id: true,
      topic: true,
      value: true,
      timestamp: true,
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  // get rid of ids
  const messagesToSend = messages.map(({ id, ...rest }) => {
    return {
      ...rest,
      timestamp: rest.timestamp.getTime(),
    } as MQTTMessageTransfer;
  });

  const serviceResponse = ServiceResponse.success("Data here.", messagesToSend, 200);
  return handleServiceResponse(serviceResponse, res);
});
