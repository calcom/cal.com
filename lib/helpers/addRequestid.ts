import { NextMiddleware } from "next-api-middleware";
import { nanoid } from "nanoid";

export const addRequestId: NextMiddleware = async (_req, res, next) => {
    // Apply header
    res.setHeader("X-Response-ID", nanoid());
    // Let remaining middleware and API route execute
    await next();
};