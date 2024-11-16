import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";

import { checkAdminAccessToTeam } from "../../_utils/adminAccessToTeamUtils";
import checkSession from "../../_utils/auth";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { checkInstalled } from "../../_utils/installation";
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
  if (!teamId) {
    teamId = JSON.parse(state)?.teamId || "";
  }
  const hasAdminAccess = await checkAdminAccessToTeam({
    teamId: teamId ? Number(teamId) : null,
    userId: Number(user.id),
  });

  if (!hasAdminAccess && teamId) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized. Need to be admin" });
  }
  const appKeys = await getAppKeysFromSlug(appConfig.slug, true);
  const hasAppConfig = !!appKeys?.client_id && !!appKeys?.client_secret;
  await checkInstalled("pipedrive-crm", session.user?.id);
  const params = {
    client_id: (appKeys.client_id || "") as string,
    response_type: "code",
    state: req.query.state,
    tentId: req.query.tentId,
    client_secret: "",
  };
  if (hasAppConfig && user.role === "ADMIN" && !teamId) {
    params.client_secret = (appKeys.client_secret || "") as string;
  }
  const query = stringify(params);

  return res.status(200).json({
    url:
      params.client_secret || !hasAppConfig
        ? `${WEBAPP_URL}/apps/pipedrive-crm/setup?${query}`
        : `https://oauth.pipedrive.com/oauth/authorize?${query}&redirect_uri=${WEBAPP_URL}/api/integrations/pipedrive-crm/callback`,
  });
}
