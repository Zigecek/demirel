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
      valueType: true,
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
        valueType: true,
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
  const start = new Date();
  start.setHours(0, 0, 0, 0);

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

  // get type of values
  const valueType = messages[0].valueType;

  // BOOLEAN
  let uptime: number | null = null;
  let downtime: number | null = null;

  if (valueType === "BOOLEAN") {
    messages.unshift({
      ...messages[0],
      timestamp: start,
    });
    messages.push({
      ...messages[messages.length - 1],
      timestamp: new Date(),
    });

    // get duration the value was true
    uptime = 0;
    downtime = 0;
    let lastUpTimestamp = null;
    let lastDownTimestamp = null;
    for (let i = 0; i < messages.length; i++) {
      // uptime
      if (messages[i].value === true && !lastUpTimestamp) {
        lastUpTimestamp = messages[i].timestamp.getTime();
        continue;
      }
      if (messages[Math.min(i + 1, messages.length - 1)].value === false && lastUpTimestamp) {
        uptime += messages[i].timestamp.getTime() - lastUpTimestamp;
        lastUpTimestamp = null;
        continue;
      }
      if (i === messages.length - 1 && messages[i].value === true && lastUpTimestamp) {
        uptime += new Date().getTime() - lastUpTimestamp;
      }

      // downtime
      if (messages[i].value === false && !lastDownTimestamp) {
        lastDownTimestamp = messages[i].timestamp.getTime();
        continue;
      }
      if (messages[Math.min(i + 1, messages.length - 1)].value === true && lastDownTimestamp) {
        downtime += messages[i].timestamp.getTime() - lastDownTimestamp;
        lastDownTimestamp = null;
        continue;
      }
      if (i === messages.length - 1 && messages[i].value === false && lastDownTimestamp) {
        downtime += new Date().getTime() - lastDownTimestamp;
      }
    }
  }

  // FLOAT
  let min: number | null = null;
  let max: number | null = null;
  let avg: number | null = null;
  let count: number | null = null;

  if (valueType === "FLOAT") {
    const vals = messages.map((m) => m.value as number);
    min = Math.min(...vals);
    max = Math.max(...vals);
    count = vals.length;
    avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  // STRING
  let first: string | null = null;
  let last: string | null = null;

  if (valueType === "STRING") {
    first = messages[0].value as string;
    last = messages[messages.length - 1].value as string;
  }

  const retutnObj: postMqttTodayResponse = {
    topic: topic,
    valueType: valueType,

    // BOOLEAN
    uptime: uptime, // in milliseconds
    downtime: downtime, // in milliseconds

    // FLOAT
    min: min,
    max: max,
    avg: avg,
    count: count,

    // STRING
    first: first,
    last: last,
  };

  const serviceResponse = ServiceResponse.success("Data here.", retutnObj, 200);
  return handleServiceResponse(serviceResponse, res);
});
