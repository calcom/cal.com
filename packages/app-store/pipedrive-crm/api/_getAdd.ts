import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";

import checkSession from "../../_utils/auth";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { checkInstalled } from "../../_utils/installation";
import { throwIfNotHaveAdminAccessToTeam } from "../../_utils/throwIfNotHaveAdminAccessToTeam";
import appConfig from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const session = checkSession(req);
  const user = session?.user;
  if (!user) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }

  let teamId = req?.query?.teamId;
  const state = (req?.query?.state || "{}") as string;
  const parsedState = JSON.parse(state);
  if (!teamId) {
    teamId = parsedState?.teamId || "";
  }
  const upgrade = parsedState.upgrade || false;
  await throwIfNotHaveAdminAccessToTeam({
    teamId: teamId ? Number(teamId) : null,
    userId: Number(user.id),
  });

  const appKeys = await getAppKeysFromSlug(appConfig.slug, true);
  if (!upgrade) {
    await checkInstalled("pipedrive-crm", session.user?.id);
  }
  const params = {
    client_id: (appKeys.client_id || "") as string,
    response_type: "code",
    state: req.query.state,
    tentId: req.query.tentId,
    client_secret: (appKeys.client_secret || "") as string,
  };
  const query = stringify(params);

  return res.status(200).json({
    url: `${WEBAPP_URL}/apps/pipedrive-crm/setup?${query}`,
  });
}
