import type { NextApiRequest, NextApiResponse } from "next";

import checkSession from "@calcom/app-store/_utils/auth";
import getInstalledAppPath from "@calcom/app-store/_utils/getInstalledAppPath";
import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import config from "../config.json";
import { appKeysSchema } from "../zod";

export async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const session = checkSession(req);

  const { apiKey, projectId, endpoint } = appKeysSchema.parse(req.body);
  if (!apiKey || !projectId || !endpoint)
    throw new HttpError({ statusCode: 400, message: "App Keys invalid." });

  try {
    await createDefaultInstallation({
      appType: config.type,
      user: session.user,
      slug: config.slug,
      key: {
        apiKey,
        projectId,
        endpoint,
        disabledEvents: [],
      },
    });
  } catch (reason) {
    return res.status(500).json({ message: "Could not add audit log app" });
  }

  return res.status(200).json({ url: getInstalledAppPath({ variant: "auditLogs", slug: config.slug }) });
}

export default defaultResponder(getHandler);
