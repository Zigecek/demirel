import express, { type Request, type Response, type Router } from "express";

import { ServiceResponse } from "../utils/serviceResponse";
import { handleServiceResponse } from "../utils/httpHandlers";

export const rootRouter: Router = express.Router();

rootRouter.get("/", (_req: Request, res: Response) => {
  const serviceResponse = ServiceResponse.success("API's working", "Hello World!");
  return handleServiceResponse(serviceResponse, res);
});
