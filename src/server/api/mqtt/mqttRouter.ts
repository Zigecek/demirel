import express, { type Request, type Response, type Router } from "express";
import { ServiceResponse } from "../../common/utils/serviceResponse";
import { handleServiceResponse } from "../../common/utils/httpHandlers";
import { prisma } from "../../index";
import { calculateStats, getDayDates } from "../../../globals/daily";
import { StatusCodes } from "http-status-codes";
import { getFirstMessages } from "../../common/utils/getFirstMessages";

export const mqttRouter: Router = express.Router();

mqttRouter.post("/data", async (req: Request, res: Response) => {
  // Check if express session is authenticated
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("User not authenticated.", false, StatusCodes.UNAUTHORIZED);
    return handleServiceResponse(serviceResponse, res);
  }

  if (!req.body) {
    const serviceResponse = ServiceResponse.failure("No request body provided.", false, StatusCodes.BAD_REQUEST);
    return handleServiceResponse(serviceResponse, res);
  }

  // get request parameters
  const { start, end, topic, boolean } = req.body as postMqttDataRequest;
  if (!start || !end || !topic || typeof start !== "number" || typeof end !== "number" || typeof topic !== "string") {
    const serviceResponse = ServiceResponse.failure("No start or end time provided.", false, StatusCodes.BAD_REQUEST);
    return handleServiceResponse(serviceResponse, res);
  }
  const s = new Date(start);
  const e = new Date(end);
  const t = topic;
  //const zoom = (e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    const serviceResponse = ServiceResponse.failure("Invalid start or end time provided.", false, StatusCodes.BAD_REQUEST);
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

  const sendMessages: MQTTMessageTransfer[] = messages.map((msg) => {
    return {
      ...msg,
      timestamp: msg.timestamp.getTime(),
    } as MQTTMessageTransfer;
  });

  const serviceResponse = ServiceResponse.success("Data here.", sendMessages, StatusCodes.OK);
  return handleServiceResponse(serviceResponse, res);
});

mqttRouter.post("/today", async (req: Request, res: Response) => {
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("User not authenticated.", false, StatusCodes.UNAUTHORIZED);
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

  const serviceResponse = ServiceResponse.success("Data here.", returnObj, StatusCodes.OK);
  return handleServiceResponse(serviceResponse, res);
});

mqttRouter.post("/stats", async (req: Request, res: Response) => {
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("User not authenticated.", false, StatusCodes.UNAUTHORIZED);
    return handleServiceResponse(serviceResponse, res);
  }

  const { topic } = req.body as postMqttStatsRequest;

  if (!topic) {
    const serviceResponse = ServiceResponse.failure("No topic provided.", false, StatusCodes.BAD_REQUEST);
    return handleServiceResponse(serviceResponse, res);
  }

  const stats = await prisma.daily.findMany({
    where: {
      topic,
    },
    orderBy: {
      date: "desc",
    },
    omit: {
      id: true,
    },
  });

  // serialize bigint
  const resp = stats.map((stat) => {
    return {
      ...stat,
      uptime: stat.uptime ? Number(stat.uptime) : null,
      downtime: stat.downtime ? Number(stat.downtime) : null,
    };
  });

  const serviceResponse = ServiceResponse.success("Data here.", resp, StatusCodes.OK);
  return handleServiceResponse(serviceResponse, res);
});

mqttRouter.post("/nickname", async (req: Request, res: Response) => {
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("User not authenticated.", false, StatusCodes.UNAUTHORIZED);
    return handleServiceResponse(serviceResponse, res);
  }

  const { topics } = req.body as postMqttNicknameRequest;

  if (!topics || !Array.isArray(topics)) {
    const serviceResponse = ServiceResponse.failure("No topics provided.", false, StatusCodes.BAD_REQUEST);
    return handleServiceResponse(serviceResponse, res);
  }

  const dbNicknames = await prisma.nickname.findMany({});

  const data: postMqttNicknameResponse = {};

  topics.forEach((topic) => {
    const nickname = dbNicknames.find((n) => n.topic === topic);
    if (nickname) {
      data[topic] = nickname.nickname;
    } else {
      data[topic] = topic;
    }
  });

  const serviceResponse = ServiceResponse.success("Data here.", data, StatusCodes.OK);
  return handleServiceResponse(serviceResponse, res);
});

mqttRouter.get("/firstValues", async (req: Request, res: Response) => {
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("User not authenticated.", false, StatusCodes.UNAUTHORIZED);
    return handleServiceResponse(serviceResponse, res);
  }

  const messages = await getFirstMessages();

  const sendMessages: MQTTMessageTransfer[] = messages.map((msg) => {
    return {
      ...msg,
      timestamp: msg.timestamp.getTime(),
    } as MQTTMessageTransfer;
  });

  const serviceResponse = ServiceResponse.success("Data here.", sendMessages, StatusCodes.OK);
  return handleServiceResponse(serviceResponse, res);
});
