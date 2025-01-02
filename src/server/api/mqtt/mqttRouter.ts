import express, { type Request, type Response, type Router } from "express";
import { StatusCodes } from "http-status-codes";
import { calculateStats, getDayDates } from "../../../globals/daily";
import { prisma } from "../../index";
import { handleServiceResponse } from "../../utils/httpHandlers";
import { ServiceResponse } from "../../utils/serviceResponse";

export const mqttRouter: Router = express.Router();

mqttRouter.post("/data", async (req: Request, res: Response) => {
  // Check if express session is authenticated
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("Uživatel není přihlášen.", false, StatusCodes.UNAUTHORIZED);
    handleServiceResponse(serviceResponse, res);
    return;
  }

  if (!req.body) {
    const serviceResponse = ServiceResponse.failure("Nebyla poskytnuta žádná data.", false, StatusCodes.BAD_REQUEST);
    handleServiceResponse(serviceResponse, res);
    return;
  }

  // get request parameters
  const { start, end, topic, boolean } = req.body as postMqttDataRequest;
  if (!start || !end || !topic || typeof start !== "number" || typeof end !== "number" || typeof topic !== "string") {
    const serviceResponse = ServiceResponse.failure("No start or end time provided.", false, StatusCodes.BAD_REQUEST);
    handleServiceResponse(serviceResponse, res);
    return;
  }
  const s = new Date(start);
  const e = new Date(end);
  const t = topic;
  //const zoom = (e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    const serviceResponse = ServiceResponse.failure("Invalid start or end time provided.", false, StatusCodes.BAD_REQUEST);
    handleServiceResponse(serviceResponse, res);
    return;
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
  handleServiceResponse(serviceResponse, res);
  return;
});

mqttRouter.post("/today", async (req: Request, res: Response) => {
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("Uživatel není přihlášen.", false, StatusCodes.UNAUTHORIZED);
    handleServiceResponse(serviceResponse, res);
    return;
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
    handleServiceResponse(serviceResponse, res);
    return;
  }

  const returnObj = calculateStats(messages, start, end);

  const serviceResponse = ServiceResponse.success("Data here.", returnObj, StatusCodes.OK);
  handleServiceResponse(serviceResponse, res);
  return;
});

mqttRouter.post("/stats", async (req: Request, res: Response) => {
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("Uživatel není přihlášen.", false, StatusCodes.UNAUTHORIZED);
    handleServiceResponse(serviceResponse, res);
    return;
  }

  const { topic } = req.body as postMqttStatsRequest;

  if (!topic) {
    const serviceResponse = ServiceResponse.failure("No topic provided.", false, StatusCodes.BAD_REQUEST);
    handleServiceResponse(serviceResponse, res);
    return;
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
  handleServiceResponse(serviceResponse, res);
  return;
});

mqttRouter.post("/nickname", async (req: Request, res: Response) => {
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("Uživatel není přihlášen.", false, StatusCodes.UNAUTHORIZED);
    handleServiceResponse(serviceResponse, res);
    return;
  }

  const { topics } = req.body as postMqttNicknameRequest;

  if (!topics || !Array.isArray(topics)) {
    const serviceResponse = ServiceResponse.failure("No topics provided.", false, StatusCodes.BAD_REQUEST);
    handleServiceResponse(serviceResponse, res);
    return;
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
  handleServiceResponse(serviceResponse, res);
  return;
});
/*
mqttRouter.get("/firstValues", authenticated, async (req: Request, res: Response) => {
  const messages = Object.values(await cloneMemory());

  const sendMessages: MQTTMessageTransfer[] = messages.map((msgs) => {
    return {
      ...msgs,
      timestamp: msgs.timestamp.getTime(),
    } as MQTTMessageTransfer;
  });

  const serviceResponse = ServiceResponse.success("Data here.", sendMessages, StatusCodes.OK);
  handleServiceResponse(serviceResponse, res);
  return;
});
*/
