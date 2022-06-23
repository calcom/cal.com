import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

import { deriveAppDictKeyFromType } from "@calcom/lib/deriveAppDictKeyFromType";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { getSession } from "@lib/auth";
import { HttpError } from "@lib/core/http/error";

const defaultIntegrationAddHandler = async ({
  slug,
  supportsMultipleInstalls,
  appType,
  user,
  createCredential,
}) => {
  // if (!user?.id) {
  //   return res.status(401).json({ message: "You must be logged in to do this" });
  // }
  if (!supportsMultipleInstalls) {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        appId: slug,
        userId: user.id,
      },
    });
    if (alreadyInstalled) {
      throw new Error("App is already installed");
    }
  }
  await createCredential({ user: user, appType, slug });
};

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
    const handlerMap = (await import("@calcom/app-store/apps.server.generated")).apiHandlers;

    const handlerKey = deriveAppDictKeyFromType(appName, handlerMap);
    const handlers = await handlerMap[handlerKey as keyof typeof handlerMap];
    const handler = handlers[apiEndpoint as keyof typeof handlers] as
      | NextApiHandler
      | Record<string, string | (() => void)>;
    if (typeof handler === "undefined")
      throw new HttpError({ statusCode: 404, message: `API handler not found` });
    if (typeof handler === "function") {
      await handler(req, res);
    } else {
      await defaultIntegrationAddHandler({ user: req.session?.user, ...handler });
    }
    return res.status(200).json({ url: handler.redirectUrl || "/apps/installed" });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    if (error.message) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(404).json({ message: `API handler not found` });
  }
};

export default handler;
