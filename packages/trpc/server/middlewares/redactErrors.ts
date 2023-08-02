import { Prisma } from "@prisma/client";

import logger from "@calcom/lib/logger";

import { middleware } from "../trpc";

const log = logger.getChildLogger({ prefix: [`[[redactErrors]`] });
const reactErrorsMiddleware = middleware(async ({ next }) => {
  const result = await next();
  if (result && !result.ok) {
    const cause = result.error.cause;
    if (!cause) {
      return result;
    }
    log.debug("Type of Error: ", cause.constructor);
    if (
      cause instanceof Prisma.PrismaClientInitializationError ||
      cause instanceof Prisma.PrismaClientKnownRequestError ||
      cause instanceof Prisma.PrismaClientUnknownRequestError ||
      cause instanceof Prisma.PrismaClientValidationError
    ) {
      log.error("Error: ", JSON.stringify(cause));
      throw new Error("An error occured while querying the database.");
    }
  }
  return result;
});

export default reactErrorsMiddleware;
