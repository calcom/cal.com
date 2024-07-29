import type { NextApiRequest, NextApiResponse } from "next";
import type { Session } from "next-auth";

import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { deriveAppDictKeyFromType } from "@calcom/lib/deriveAppDictKeyFromType";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import type { AppDeclarativeHandler, AppHandler } from "@calcom/types/AppHandler";

type NextApiRequestWithRequiredNonNullableSession = Omit<NextApiRequest, "session"> & {
  session: NonNullable<NextApiRequest["session"]>;
};

const defaultIntegrationAddHandler = async ({
  slug,
  supportsMultipleInstalls,
  appType,
  user,
  teamId = undefined,
  createCredential,
}: {
  slug: string;
  supportsMultipleInstalls: boolean;
  appType: string;
  user: Session["user"];
  teamId?: number;
  createCredential: AppDeclarativeHandler["createCredential"];
}) => {
  if (!supportsMultipleInstalls) {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        appId: slug,
        ...(teamId ? { AND: [{ userId: user.id }, { teamId }] } : { userId: user.id }),
      },
    });
    if (alreadyInstalled) {
      throw new Error("App is already installed");
    }
  }

  await throwIfNotHaveAdminAccessToTeam({ teamId: teamId ?? null, userId: user.id });

  await createCredential({ user: user, appType, slug, teamId });
};

// Define a type guard function
function hasValidSession(req: NextApiRequest): req is NextApiRequestWithRequiredNonNullableSession {
  return !!req.session?.user?.id;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { args, teamId } = req.query;
  if (!Array.isArray(args)) {
    return res.status(404).json({ message: `API route not found` });
  }
  // Check that user is authenticated
  req.session = await getServerSession({ req, res });
  if (!hasValidSession(req)) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }
  const [appName, apiEndpoint] = args;
  try {
    /* Absolute path didn't work */
    const handlerMap = (await import("@calcom/app-store/apps.server.generated")).apiHandlers;
    const handlerKey = deriveAppDictKeyFromType(appName, handlerMap);
    const handlers = await handlerMap[handlerKey as keyof typeof handlerMap];
    if (!handlers) throw new HttpError({ statusCode: 404, message: `No handlers found for ${handlerKey}` });
    const handler = handlers[apiEndpoint as keyof typeof handlers] as AppHandler;
    if (typeof handler === "undefined")
      throw new HttpError({ statusCode: 404, message: `API handler not found` });

    if (typeof handler === "function") {
      await handler(req, res);
    } else {
      await defaultIntegrationAddHandler({ user: req.session.user, teamId: Number(teamId), ...handler });
      const redirectUrl = handler.redirect?.url ?? undefined;
      res.json({ url: redirectUrl, newTab: handler.redirect?.newTab });
    }
    if (!res.writableEnded) return res.status(200);
    return res;
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
