import express, { type Request, type Response, type Router } from "express";
import { ServiceResponse } from "../../utils/serviceResponse";
import { handleServiceResponse } from "../../utils/httpHandlers";

export const healthCheckRouter: Router = express.Router();

healthCheckRouter.get("/", (_req: Request, res: Response) => {
  const serviceResponse = ServiceResponse.success("Service is healthy", null);
  return handleServiceResponse(serviceResponse, res);
});
