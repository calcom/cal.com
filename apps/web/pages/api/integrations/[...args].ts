import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

import { deriveAppKeyFromSlugOrType } from "@calcom/lib/deriveAppKeyFromSlugOrType";

import { getSession } from "@lib/auth";
import { HttpError } from "@lib/core/http/error";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Check that user is authenticated
  req.session = await getSession({ req });

  const { args } = req.query;

  if (!Array.isArray(args)) {
    return res.status(404).json({ message: `API route not found` });
  }

  const [appName, apiEndpoint] = args;
  try {
    /* Absolute path didn't work */
    const handlerMap = (await import("@calcom/app-store/apps.generated")).apiHandlers;

    const handlerKey = deriveAppKeyFromSlugOrType(appName, handlerMap);
    const handlers = await handlerMap[handlerKey];
    const handler = handlers[apiEndpoint as keyof typeof handlers] as NextApiHandler;
    if (typeof handler !== "function")
      throw new HttpError({ statusCode: 404, message: `API handler not found` });

    await handler(req, res);

    return res.status(200);
  } catch (error) {
    console.error(error);
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(404).json({ message: `API handler not found` });
  }
};

export default handler;
