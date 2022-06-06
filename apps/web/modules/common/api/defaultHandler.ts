import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

type Handlers = {
  [method in "GET" | "POST" | "PATCH" | "PUT" | "DELETE"]?: Promise<{ default: NextApiHandler }>;
};

/** Allows us to split big API handlers by method and auto catch unsupported methods */
const defaultHandler = (handlers: Handlers) => async (req: NextApiRequest, res: NextApiResponse) => {
  const handler = (await handlers[req.method as keyof typeof handlers])?.default;

  if (!handler) return res.status(405).json({ message: "Method not allowed" });

  try {
    await handler(req, res);
    return;
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export default defaultHandler;
