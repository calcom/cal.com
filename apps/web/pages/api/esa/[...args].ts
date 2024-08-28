import * as esaHandlers from "@esa/cal-additions/api";
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

const kebabToCamel = (s: string) => s.replace(/-./g, (x) => x[1].toUpperCase());

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { args } = req.query;

  if (!Array.isArray(args)) {
    return res.status(404).json({ message: `API route not found` });
  }

  const [apiEndpoint] = args;
  try {
    const handlerKey = kebabToCamel(apiEndpoint) as keyof typeof esaHandlers;
    const handler = esaHandlers[handlerKey] as NextApiHandler;
    if (typeof handler === "undefined") {
      return res.status(404).json({ message: "Endpoint not found" });
    }

    if (typeof handler === "function") {
      await handler(req, res);
    } else {
      return res.status(404).json({ message: "Endpoint not found" });
    }
    if (!res.writableEnded) return res.status(200);
    return res;
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(404).json({ message: "Endpoint not found" });
  }
};

export default handler;
