import express, { type Request, type Response, type Router } from "express";
import { StatusCodes } from "http-status-codes";
import { io } from "../../index";
import { handleServiceResponse } from "../../utils/httpHandlers";
import logger from "../../utils/loggers";
import { cloneMemory } from "../../utils/memory";
import { ServiceResponse } from "../../utils/serviceResponse";

export const socketsRouter: Router = express.Router();

socketsRouter.post("/auth", async (req: Request, res: Response) => {
  // Check if express session is authenticated
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("Uživatel není přihlášen.", false, StatusCodes.UNAUTHORIZED);
    return handleServiceResponse(serviceResponse, res);
  }

  const body = req.body as SocketAuth;
  if (!body.socketId) {
    const serviceResponse = ServiceResponse.failure("No socket ID provided.", false, StatusCodes.BAD_REQUEST);
    return handleServiceResponse(serviceResponse, res);
  }

  const gotSocket = io?.sockets.sockets.get(body.socketId);

  if (!gotSocket) {
    const serviceResponse = ServiceResponse.failure("Socket not found.", false, 404);
    return handleServiceResponse(serviceResponse, res);
  }

  logger.ws.info("Authorizing socket: " + gotSocket?.id);

  gotSocket.join("mqtt");

  // Get the latest value from each topic
  const messages = Object.values(await cloneMemory());

  gotSocket.emit("messages", [...new Set([...messages])]);
  logger.ws.info("Socket Authenticated.");

  const serviceResponse = ServiceResponse.success("Socket Authenticated.", true);
  return handleServiceResponse(serviceResponse, res);
});
