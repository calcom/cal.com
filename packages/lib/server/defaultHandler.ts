import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

import { httpError } from "../http-error";

type Handlers = {
  [method in "GET" | "POST" | "PATCH" | "PUT" | "DELETE"]?: Promise<{ default: NextApiHandler }>;
};

/** Allows us to split big API handlers by method */
export const defaultHandler = (handlers: Handlers) => async (req: NextApiRequest, res: NextApiResponse) => {
  const handler = (await handlers[req.method as keyof typeof handlers])?.default;
  if (!handler) {
    throw httpError({
      statusCode: 405,
      message: `Method Not Allowed (Allow: ${Object.keys(handlers).join(",")})`,
    });
  }
  await handler(req, res);
};
