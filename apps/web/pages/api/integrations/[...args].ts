import { NextApiRequest, NextApiResponse } from "next";
import type { Session } from "next-auth";

import getInstalledAppPath from "@calcom/app-store/_utils/getInstalledAppPath";
import { getSession } from "@calcom/lib/auth";
import { deriveAppDictKeyFromType } from "@calcom/lib/deriveAppDictKeyFromType";
import prisma from "@calcom/prisma";
import type { AppDeclarativeHandler, AppHandler } from "@calcom/types/AppHandler";

import { HttpError } from "@lib/core/http/error";

const defaultIntegrationAddHandler = async ({
  slug,
  supportsMultipleInstalls,
  appType,
  user,
  createCredential,
}: {
  slug: string;
  supportsMultipleInstalls: boolean;
  appType: string;
  user?: Session["user"];
  createCredential: AppDeclarativeHandler["createCredential"];
}) => {
  if (!user?.id) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }
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
    const handler = handlers[apiEndpoint as keyof typeof handlers] as AppHandler;
    let redirectUrl = "/apps/installed";
    if (typeof handler === "undefined")
      throw new HttpError({ statusCode: 404, message: `API handler not found` });

    if (typeof handler === "function") {
      await handler(req, res);
    } else {
      await defaultIntegrationAddHandler({ user: req.session?.user, ...handler });
      redirectUrl = handler.redirect?.url || getInstalledAppPath(handler);
      res.json({ url: redirectUrl, newTab: handler.redirect?.newTab });
    }
    return res.status(200);
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
