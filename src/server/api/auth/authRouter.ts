import express, { type Request, type Response, type Router } from "express";

import { ServiceResponse } from "../../common/utils/serviceResponse";
import { handleServiceResponse } from "../../common/utils/httpHandlers";
import { logger } from "../../server";
//import { io } from "../../index";
import { prisma } from "../../index";
import argon2 from "argon2";
import { user } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

export const authRouter: Router = express.Router();

authRouter.get("/loggedIn", (req: Request, res: Response) => {
  // Check if express session is authenticated
  if (!req.session?.user) {
    // User is not authenticated
    // then redirect to login page
    const serviceResponse = ServiceResponse.success("Uživatel není přihlášen.", false);
    return handleServiceResponse(serviceResponse, res);
  }

  const { password, ...userSafe } = req.session.user;

  const serviceResponse = ServiceResponse.success("User authenticated.", userSafe as Omit<user, "password">, StatusCodes.OK);
  return handleServiceResponse(serviceResponse, res);
});

authRouter.post("/login", async (req: Request, res: Response) => {
  // if session user exists
  if (req.session?.user) {
    const serviceResponse = ServiceResponse.success("User already logged in.", true, 202);
    return handleServiceResponse(serviceResponse, res);
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
    return handleServiceResponse(serviceResponse, res);
  }

  // check if password is correct
  const isPasswordCorrect = await argon2.verify(user.password, password);

  if (!isPasswordCorrect) {
    const serviceResponse = ServiceResponse.failure("Password is incorrect.", false, StatusCodes.UNAUTHORIZED);
    return handleServiceResponse(serviceResponse, res);
  }

  // login was successful

  // set session user
  req.session.user = user;

  const serviceResponse = ServiceResponse.success("Login successful.", true, StatusCodes.OK);
  return handleServiceResponse(serviceResponse, res);
});

authRouter.get("/logout", async (req: Request, res: Response) => {
  // if session user does not exist
  if (!req.session?.user) {
    const serviceResponse = ServiceResponse.success("User not logged in.", false);
    return handleServiceResponse(serviceResponse, res);
  }

  // if session user exists
  // then delete session user
  req.session.destroy((err) => {
    if (err) {
      logger.error("Error destroying session: ", err);
    }
  });

  // send Response
  res.redirect("/login");
});

authRouter.post("/register", async (req: Request, res: Response) => {
  // if session user exists
  if (req.session?.user) {
    const serviceResponse = ServiceResponse.success("User already logged in.", true, 202);
    return handleServiceResponse(serviceResponse, res);
  }

  // if session user does not exist
  // then create a session user
  const { username, password } = req.body;

  if (!username || !password) {
    const serviceResponse = ServiceResponse.failure("Please fill in all fields.", false, StatusCodes.BAD_REQUEST);
    return handleServiceResponse(serviceResponse, res);
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
    return handleServiceResponse(serviceResponse, res);
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
