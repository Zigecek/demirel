import express, { type Request, type Response, type Router } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../..";
import { authenticated } from "../../middlewares/authenticated";
import { handleServiceResponse } from "../../utils/httpHandlers";
import { ServiceResponse } from "../../utils/serviceResponse";

export const ruleRouter: Router = express.Router();
/*
ruleRouter.post("/updateRules", authenticated, async (req: Request, res: Response) => {
  req.session.user = req.session.user!;
  const username = req.session.user.username;

  if (!req.body) {
    const serviceResponse = ServiceResponse.failure("Nebyla poskytnuta žádná data.", false, StatusCodes.BAD_REQUEST);
    handleServiceResponse(serviceResponse, res);
    return;
  }

  const { added, edited, deleted } = req.body as SetRules;

  if (!added || !edited || !deleted) {
    const serviceResponse = ServiceResponse.failure("Nebyla poskytnuta žádná pravidla.", false, StatusCodes.BAD_REQUEST);
    handleServiceResponse(serviceResponse, res);
    return;
  }

  // validate all rules
  const allRules = [...added, ...edited];
  for (const rule of allRules) {
    if (!rule.name || rule.notificationTitle == undefined || rule.notificationBody == undefined || !rule.severity || !rule.conditions || !rule.topics) {
      const serviceResponse = ServiceResponse.failure("Pravidlu chybí požadovaná data.", false, StatusCodes.BAD_REQUEST);
      handleServiceResponse(serviceResponse, res);
      return;
    }
  }

  // validate all conditions
  for (const rule of allRules) {
    for (const condition of rule.conditions) {
      if (!condition) {
        const serviceResponse = ServiceResponse.failure("Podmínka je prázdná.", false, StatusCodes.BAD_REQUEST);
        handleServiceResponse(serviceResponse, res);
        return;
      }

      const fv = Object.values(await cloneMemory());
      const topics: RuleTopics = {};

      fv.forEach((msgs) => {
        topics[msgs.topic] = msgs.valueType === "FLOAT" ? "number" : "boolean";
      });

      if (!validateExpression(condition, topics)) {
        const serviceResponse = ServiceResponse.failure("Podmínka je neplatná.", false, StatusCodes.BAD_REQUEST);
        handleServiceResponse(serviceResponse, res);
        return;
      }
    }
  }

  const ruleToData = (rule: Rule) => ({
    name: rule.name,
    notificationTitle: rule.notificationTitle,
    notificationBody: rule.notificationBody,
    severity: rule.severity,
    conditions: rule.conditions.map((condition) => condition.trim()),
    topics: [...new Set([...rule.conditions.map((condition) => extractTopics(condition))].flat())],
  });

  const transactionData = [
    ...edited.map((rule) =>
      prisma.rule.update({
        where: {
          id: rule.id,
        },
        data: ruleToData(rule),
      })
    ),
    prisma.rule.createMany({
      data: added.map((rule) => ({
        ...ruleToData(rule),
        userId: username,
      })),
    }),
    ...deleted.map((rule) =>
      prisma.rule.delete({
        where: {
          id: rule.id,
        },
      })
    ),
  ];

  await prisma.$transaction(transactionData);

  await updateRules(username);

  const serviceResponse = ServiceResponse.success("Pravidla uložena.", true, StatusCodes.OK);
  handleServiceResponse(serviceResponse, res);
  return;
});
*/
ruleRouter.get("/getRules", authenticated, async (req: Request, res: Response) => {
  req.session.user = req.session.user!;

  if (!req.query) {
    const serviceResponse = ServiceResponse.failure("Nebyla poskytnuta žádná data.", false, StatusCodes.BAD_REQUEST);
    handleServiceResponse(serviceResponse, res);
    return;
  }

  const rules = (await prisma.rule.findMany({
    where: {
      user: {
        username: req.session.user.username,
      },
    },
    omit: {
      userId: true,
    },
  })) as Rule[];

  const serviceResponse = ServiceResponse.success("Pravidla poskytnuta.", rules, StatusCodes.OK);
  handleServiceResponse(serviceResponse, res);
  return;
});
