import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { handleServiceResponse } from "../utils/httpHandlers";
import { ServiceResponse } from "../utils/serviceResponse";

export const authenticated = (req: Request, res: Response, next: NextFunction) => {
  // Check if express session is authenticated
  if (!req.session?.user?.username) {
    const serviceResponse = ServiceResponse.failure("Uživatel není přihlášen.", false, StatusCodes.UNAUTHORIZED);
    return next(handleServiceResponse(serviceResponse, res));
  }
  return next();
};
