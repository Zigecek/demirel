import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { createApiResponse } from "../../api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "../../common/models/serviceResponse";
import { handleServiceResponse } from "../../common/utils/httpHandlers";
import { io, prisma } from "../../index";
//import { getRetainedMessages } from "../../mqtt-client";
import { logger } from "../../server";
import { MqttValueType } from "@prisma/client";

export const mqttRegistry = new OpenAPIRegistry();
export const mqttRouter: Router = express.Router();

mqttRegistry.registerPath({
  method: "get",
  path: "/auth",
  tags: ["MQTT"],
  responses: createApiResponse(z.boolean(), "Success"),
});

mqttRouter.get("/data", async (req: Request, res: Response) => {
  // Check if express session is authenticated
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("User not authenticated.", false, 401);
    return handleServiceResponse(serviceResponse, res);
  }

  const messages = await prisma.mqtt.findMany({
    orderBy: {
      timestamp: "asc",
    },
  });
  // get rid of ids
  const messagesToSend = messages.map(({ id, ...rest }) => {
    return {
      ...rest,
      timestamp: rest.timestamp.getTime(),
    } as MQTTMessageNew & { timestamp: number };
  });
});
