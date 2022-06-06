import { NextMiddleware } from "next-api-middleware";

import prisma from "@calcom/prisma";

// This replaces the prisma client for the cusotm one if the customApiId is valid
export const customApiEndpoints: NextMiddleware = async (req, res, next) => {
  const {
    query: { customApiId },
  } = req;
  // If no custom api Id is provided, return the regular cal.com prisma client.
  if (!customApiId) {
    req.prisma = prisma();
    await next();
  }
  // Hardcoded new database, this should be a dynamic call to console prisma/api?
  const newDatabseUrl = process.env.DATABASE_PROD_URL;
  req.prisma = prisma(newDatabseUrl);

  await next();
};
