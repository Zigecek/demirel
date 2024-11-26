import express, { type Request, type Response, type Router } from "express";
import { ServiceResponse } from "../../common/utils/serviceResponse";
import { handleServiceResponse } from "../../common/utils/httpHandlers";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../..";
import { extractTopics } from "../../../globals/rules";
import { updateRules } from "../../common/utils/services/rules";

export const ruleRouter: Router = express.Router();

ruleRouter.post("/updateRules", async (req: Request, res: Response) => {
  // Check if express session is authenticated
  if (!req.session?.user || !req.session?.user.username) {
    const serviceResponse = ServiceResponse.failure("User not authenticated.", false, StatusCodes.UNAUTHORIZED);
    return handleServiceResponse(serviceResponse, res);
  }
  const username = req.session.user.username;

  if (!req.body) {
    const serviceResponse = ServiceResponse.failure("No request body provided.", false, StatusCodes.BAD_REQUEST);
    return handleServiceResponse(serviceResponse, res);
  }

  const { added, edited, deleted } = req.body as SetRules;

  if (!added || !edited || !deleted) {
    const serviceResponse = ServiceResponse.failure("No rules provided.", false, StatusCodes.BAD_REQUEST);
    return handleServiceResponse(serviceResponse, res);
  }

  await prisma.$transaction([
    ...edited.map((rule) =>
      prisma.rule.update({
        where: {
          id: rule.id,
        },
        data: {
          name: rule.name,
          severity: rule.severity,
          conditions: rule.conditions,
          topics: [extractTopics(rule.notificationBody), extractTopics(rule.notificationTitle), ...rule.conditions.map((condition) => extractTopics(condition))].flat(),
        },
      })
    ),
    prisma.rule.createMany({
      data: added.map((rule) => ({
        name: rule.name,
        severity: rule.severity,
        conditions: rule.conditions,
        notificationTitle: rule.notificationTitle,
        notificationBody: rule.notificationBody,
        topics: [extractTopics(rule.notificationBody), extractTopics(rule.notificationTitle), ...rule.conditions.map((condition) => extractTopics(condition))].flat(),
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
  ]);

  await updateRules(username);

  const serviceResponse = ServiceResponse.success("Rules updated.", true, StatusCodes.OK);
  return handleServiceResponse(serviceResponse, res);
});

ruleRouter.get("/getRules", async (req: Request, res: Response) => {
  // Check if express session is authenticated
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("User not authenticated.", false, StatusCodes.UNAUTHORIZED);
    return handleServiceResponse(serviceResponse, res);
  }

  if (!req.query) {
    const serviceResponse = ServiceResponse.failure("No request body provided.", false, StatusCodes.BAD_REQUEST);
    return handleServiceResponse(serviceResponse, res);
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

  const serviceResponse = ServiceResponse.success("Rules fetched.", rules, StatusCodes.OK);
  return handleServiceResponse(serviceResponse, res);
});
