/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from "@prisma/client";
import type { NextMiddleware } from "next-api-middleware";

const messages = {
  TOKEN_NOT_SUPPLIED: "TOKEN_NOT_SUPPLIED",
  TOKEN_INVALID: "TOKEN_INVALID",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
};

export const verifyManagedSetupCompletionToken: NextMiddleware = async function (req, res, next) {
  try {
    const { authorization } = req.headers;
    if (!authorization) {
      throw new Error(messages.TOKEN_NOT_SUPPLIED);
    }
    if (authorization.split(" ")[0] !== "Bearer") {
      throw new Error(messages.TOKEN_INVALID);
    }
    const [, token] = authorization.split(" ");

    if (!token) {
      throw new Error(messages.TOKEN_NOT_SUPPLIED);
    }

    const prisma: PrismaClient = (req as any).prisma;
    const setupEntry = await prisma.zohoSchedulingSetup.findFirst({
      where: {
        completeSetupToken: token,
      },
    });

    if (!setupEntry) {
      throw new Error(messages.TOKEN_INVALID);
    }

    (req as any).setupId = setupEntry.id;

    await next();
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return res.status(401).json({
        message: Object.values(messages).includes(error.message) ? error.message : `${error.message}`,
      });
    }

    return res.status(401).json({
      message: `Unable to verify crm token`,
    });
  }
};
