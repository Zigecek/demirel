import express, { type Request, type Response, type Router } from "express";

import { handleServiceResponse } from "../utils/httpHandlers";
import { ServiceResponse } from "../utils/serviceResponse";

export const rootRouter: Router = express.Router();

rootRouter.get("/", (_req: Request, res: Response) => {
  const serviceResponse = ServiceResponse.success("API's working", "Hello World!");
  handleServiceResponse(serviceResponse, res);
  return;
});
