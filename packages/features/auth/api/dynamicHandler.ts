import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

import { HttpError } from "@calcom/lib/http-error";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Check that user is authenticated
  const { nextauth } = req.query;
  if (!Array.isArray(nextauth)) {
    return res.status(404).json({ message: `API route not found` });
  }

  try {
    /* Absolute path didn't work */
    const handlerMap = (await import("./index")).authApiHandlers;
    const handlerKey = nextauth.join("/");
    let handler: NextApiHandler;
    if (handlerKey in handlerMap) {
      handler = (await handlerMap[handlerKey as keyof typeof handlerMap])?.default;
    } else {
      handler = (await handlerMap.default).default;
    }
    if (typeof handler !== "function") {
      return res.status(404).json({ message: `API handler not found` });
    }
    return await handler(req, res);
  } catch (error) {
    console.error(error);

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(404).json({ message: `API handler not found` });
  }
};

export default handler;
