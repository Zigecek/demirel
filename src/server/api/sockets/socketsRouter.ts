import express, { type Request, type Response, type Router } from "express";
import { ServiceResponse } from "../../common/utils/serviceResponse";
import { handleServiceResponse } from "../../common/utils/httpHandlers";
import { io, prisma } from "../../index";
import { logger } from "../../server";
import { StatusCodes } from "http-status-codes";
import { getFirstMessages } from "../../common/utils/getFirstMessages";

export const socketsRouter: Router = express.Router();

socketsRouter.post("/auth", async (req: Request, res: Response) => {
  // Check if express session is authenticated
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.failure("User not authenticated.", false, StatusCodes.UNAUTHORIZED);
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

  logger.info("WS: Authorizing socket: " + gotSocket?.id);

  gotSocket.join("mqtt");

  // Get the latest value from each topic
  const messages = await getFirstMessages();

  gotSocket.emit("messages", [...new Set([...messages])]);
  logger.info("WS: Socket Authenticated.");

  const serviceResponse = ServiceResponse.success("Socket Authenticated.", true);
  return handleServiceResponse(serviceResponse, res);
});
