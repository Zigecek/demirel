import express, { type Request, type Response, type Router } from "express";

import { handleServiceResponse } from "../../utils/httpHandlers";
import { ServiceResponse } from "../../utils/serviceResponse";
//import { io } from "../../index";
import { user } from "@prisma/client";
import argon2 from "argon2";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../index";
import { authenticated } from "../../middlewares/authenticated";
import logger from "../../utils/loggers";

export const authRouter: Router = express.Router();

authRouter.get("/loggedIn", (req: Request, res: Response) => {
  // Check if express session is authenticated
  if (!req.session?.user) {
    // User is not authenticated
    // then redirect to login page
    const serviceResponse = ServiceResponse.success("Uživatel není přihlášen.", false);
    handleServiceResponse(serviceResponse, res);
    return;
  }

  const { password, ...userSafe } = req.session.user;

  const serviceResponse = ServiceResponse.success("User authenticated.", userSafe as Omit<user, "password">, StatusCodes.OK);
  handleServiceResponse(serviceResponse, res);
  return;
});

authRouter.post("/login", async (req: Request, res: Response) => {
  // if session user exists
  if (req.session?.user) {
    const serviceResponse = ServiceResponse.success("User already logged in.", true, 202);
    handleServiceResponse(serviceResponse, res);
    return;
  }

  // if session user does not exist
  // then create a session user
  const { username, password } = req.body;

  // chceck if username exists
  const user = await prisma.user.findUnique({
    where: {
      username: username,
    },
  });

  if (!user) {
    const serviceResponse = ServiceResponse.failure("User not found.", false, 404);
    handleServiceResponse(serviceResponse, res);
    return;
  }

  // check if password is correct
  const isPasswordCorrect = await argon2.verify(user.password, password);

  if (!isPasswordCorrect) {
    const serviceResponse = ServiceResponse.failure("Password is incorrect.", false, StatusCodes.UNAUTHORIZED);
    handleServiceResponse(serviceResponse, res);
    return;
  }

  // login was successful

  // set session user
  req.session.user = user;

  const serviceResponse = ServiceResponse.success("Login successful.", true, StatusCodes.OK);
  handleServiceResponse(serviceResponse, res);
  return;
});

authRouter.get("/logout", authenticated, async (req: Request, res: Response) => {
  // if session user exists
  // then delete session user
  req.session.destroy((err) => {
    if (err) {
      logger.system.error("Error destroying session: ", err);
    }
  });

  // send Response
  res.redirect("/");
});

authRouter.post("/register", async (req: Request, res: Response) => {
  // if session user exists
  if (req.session?.user) {
    const serviceResponse = ServiceResponse.success("User already logged in.", true, 202);
    handleServiceResponse(serviceResponse, res);
    return;
  }

  // if session user does not exist
  // then create a session user
  const { username, password } = req.body;

  if (!username || !password) {
    const serviceResponse = ServiceResponse.failure("Please fill in all fields.", false, StatusCodes.BAD_REQUEST);
    handleServiceResponse(serviceResponse, res);
    return;
  }

  // chceck if username exists
  const user = await prisma.user.findUnique({
    where: {
      username: username,
    },
  });

  if (user) {
    const serviceResponse = ServiceResponse.failure(
      "User already exists.",
      {
        username: user.username,
      },
      409
    );
    handleServiceResponse(serviceResponse, res);
    return;
  }

  // hash password
  const hashedPassword = await argon2.hash(password);

  // create user
  const newUser = await prisma.user.create({
    data: {
      username: username,
      password: hashedPassword,
    },
  });

  // set session user
  req.session.user = newUser;

  // send response
  res.redirect("/");
});
