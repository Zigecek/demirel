import express, { type Request, type Response, type Router } from "express";
import { StatusCodes } from "http-status-codes";
import { io } from "../..";
import { authenticated } from "../../middlewares/authenticated";
import { handleServiceResponse } from "../../utils/httpHandlers";
import logger from "../../utils/loggers";
import { cloneMemory } from "../../utils/memory";
import { ServiceResponse } from "../../utils/serviceResponse";

export const socketsRouter: Router = express.Router();

socketsRouter.post("/auth", authenticated, async (req: Request, res: Response) => {
  const body = req.body as SocketAuth;
  if (!body.socketId) {
    const serviceResponse = ServiceResponse.failure("No socket ID provided.", false, StatusCodes.BAD_REQUEST);
    handleServiceResponse(serviceResponse, res);
    return;
  }

  const gotSocket = io?.sockets.sockets.get(body.socketId);

  if (!gotSocket) {
    const serviceResponse = ServiceResponse.failure("Socket not found.", false, 404);
    handleServiceResponse(serviceResponse, res);
    return;
  }

  logger.ws.info("Authorizing socket: " + gotSocket?.id);

  gotSocket.join("auth");

  // Get the latest value from each topic
  const messages = Object.values(await cloneMemory()).map((msgs) => msgs[0]);

  gotSocket.emit("messages", [...new Set([...messages])]);
  logger.ws.info("Socket Authenticated.");

  const serviceResponse = ServiceResponse.success("Socket Authenticated.", true);
  handleServiceResponse(serviceResponse, res);
  return;
});
