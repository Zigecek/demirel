import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { createApiResponse } from "../../api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "../../common/models/serviceResponse";
import { handleServiceResponse } from "../../common/utils/httpHandlers";
import { prisma } from "../../index";
import { calculateStats, getDayDates } from "../../../globals/daily";

export const mqttRegistry = new OpenAPIRegistry();
export const mqttRouter: Router = express.Router();

mqttRegistry.registerPath({
  method: "post",
  path: "/data",
  tags: ["MQTT"],
  responses: createApiResponse(z.object({}), "Success"),
});

mqttRouter.post("/data", async (req: Request, res: Response) => {
  // Check if express session is authenticated
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("User not authenticated.", false, 401);
    return handleServiceResponse(serviceResponse, res);
  }

  if (!req.body) {
    const serviceResponse = ServiceResponse.failure("No request body provided.", false, 400);
    return handleServiceResponse(serviceResponse, res);
  }

  // get request parameters
  const { start, end, topic, boolean } = req.body as postMqttDataRequest;
  if (!start || !end || !topic || typeof start !== "number" || typeof end !== "number" || typeof topic !== "string") {
    const serviceResponse = ServiceResponse.failure("No start or end time provided.", false, 400);
    return handleServiceResponse(serviceResponse, res);
  }
  const s = new Date(start);
  const e = new Date(end);
  const t = topic;
  //const zoom = (e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    const serviceResponse = ServiceResponse.failure("Invalid start or end time provided.", false, 400);
    return handleServiceResponse(serviceResponse, res);
  }

  // get all messages between start and end
  const messages = (await prisma.mqtt.findMany({
    where: {
      timestamp: {
        gte: s,
        lte: e,
      },
      topic: t,
    },
    omit: {
      id: true,
    },
    orderBy: {
      timestamp: "asc",
    },
  })) as MQTTMessage[];

  // if boolean is true, get also first value before start
  if (boolean) {
    const firstMessage = (await prisma.mqtt.findFirst({
      where: {
        timestamp: {
          lt: s,
        },
        topic: t,
      },
      omit: {
        id: true,
      },
      orderBy: {
        timestamp: "desc",
      },
    })) as MQTTMessage;
    if (firstMessage) {
      messages.unshift(firstMessage);
    }
  }

  const serviceResponse = ServiceResponse.success("Data here.", messages, 200);
  return handleServiceResponse(serviceResponse, res);
});

mqttRegistry.registerPath({
  method: "post",
  path: "/today",
  tags: ["MQTT"],
  responses: createApiResponse(z.object({}), "Success"),
});

mqttRouter.post("/today", async (req: Request, res: Response) => {
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("User not authenticated.", false, 401);
    return handleServiceResponse(serviceResponse, res);
  }

  // get timestamp of start of today
  const { start, end } = getDayDates(new Date());

  const { topic } = req.body as postMqttTodayRequest;

  const messages = (await prisma.mqtt.findMany({
    where: {
      timestamp: {
        gte: start,
      },
      topic: topic,
    },
    omit: {
      id: true,
    },
    orderBy: {
      timestamp: "asc",
    },
  })) as MQTTMessage[];

  // Preventive statements
  if (messages.length === 0) {
    const serviceResponse = ServiceResponse.failure("No data for today.", false, 404);
    return handleServiceResponse(serviceResponse, res);
  }

  const returnObj = calculateStats(messages, start, end);

  const serviceResponse = ServiceResponse.success("Data here.", returnObj, 200);
  return handleServiceResponse(serviceResponse, res);
});
