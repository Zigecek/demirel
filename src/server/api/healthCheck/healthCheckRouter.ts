import express, { type Request, type Response, type Router } from "express";
import { handleServiceResponse } from "../../utils/httpHandlers";
import { ServiceResponse } from "../../utils/serviceResponse";

export const healthCheckRouter: Router = express.Router();

healthCheckRouter.get("/", (_req: Request, res: Response) => {
  const serviceResponse = ServiceResponse.success("Service is healthy", null);
  handleServiceResponse(serviceResponse, res);
  return;
});
