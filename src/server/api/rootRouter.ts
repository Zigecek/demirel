import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";

import { createApiResponse } from "../api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "../common/models/serviceResponse";
import { handleServiceResponse } from "../common/utils/httpHandlers";

export const rootRegistry = new OpenAPIRegistry();
export const rootRouter: Router = express.Router();

rootRegistry.registerPath({
  method: "get",
  path: "/",
  tags: ["API check"],
  responses: createApiResponse(z.string(), "Success"),
});

rootRouter.get("/", (_req: Request, res: Response) => {
  const serviceResponse = ServiceResponse.success("API's working", "Hello World!");
  return handleServiceResponse(serviceResponse, res);
});
