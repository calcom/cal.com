import type { NextMiddleware } from "next-api-middleware";

export const extendRequest: NextMiddleware = async (req, res, next) => {
  req.pagination = {
    take: 100,
    skip: 0,
  };
  await next();
};
