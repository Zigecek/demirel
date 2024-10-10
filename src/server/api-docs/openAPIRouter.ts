import express, { type Request, type Response, type Router } from "express";
import swaggerUi from "swagger-ui-express";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

import { generateOpenAPIDocument } from "./openAPIDocumentGenerator";
import { createApiResponse } from "./openAPIResponseBuilders";
import { z } from "zod";

export const openAPIRegistry = new OpenAPIRegistry();
export const openAPIRouter: Router = express.Router();
const openAPIDocument = generateOpenAPIDocument();

openAPIRouter.get("/swagger.json", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.send(openAPIDocument);
});

openAPIRouter.use("/swagger", swaggerUi.serve, swaggerUi.setup(openAPIDocument));

openAPIRegistry.registerPath({
  method: "get",
  path: "/swagger.json",
  tags: ["Swagger UI OpenAPI"],
  responses: createApiResponse(z.any(), "Success"),
});
