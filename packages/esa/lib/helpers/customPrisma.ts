import type { NextMiddleware } from "next-api-middleware";

import { customPrisma } from "@calcom/prisma";

// This replaces the prisma client for the custom one if the key is valid
export const customPrismaClient: NextMiddleware = async (req, res, next) => {
  req.prisma = customPrisma();
  await next();
  return;
};
