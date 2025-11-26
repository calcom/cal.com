import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

type Handlers = {
  [method in "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "OPTIONS"]?: Promise<{ default: NextApiHandler }>;
};

/** Allows us to split big API handlers by method */
export const defaultHandler = (handlers: Handlers) => async (req: NextApiRequest, res: NextApiResponse) => {
  const handler = (await handlers[req.method as keyof typeof handlers])?.default;
  // auto catch unsupported methods.
  if (!handler) {
    return res
      .status(405)
      .json({ message: `Method Not Allowed (Allow: ${Object.keys(handlers).join(",")})` });
  }
  return await handler(req, res);
};
