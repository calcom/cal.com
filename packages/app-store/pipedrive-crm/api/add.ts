import type { NextApiRequest, NextApiResponse } from "next";

import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";
import appConfig from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const appKeys = await getAppKeysFromSlug(appConfig.slug);
  let client_id = "";
  if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
  if (!client_id) return res.status(400).json({ message: "Pipedrive client id missing." });

  req.session = await getServerSession({ req });
  const { teamId } = req.query;
  const user = req.session?.user;
  if (!user) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  await createDefaultInstallation({
    appType: `${appConfig.slug}_other_calendar`,
    user,
    slug: appConfig.slug,
    key: {},
    teamId: Number(teamId),
  });

  const redirectUri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/pipedrive-crm/callback`;
  const state = encodeOAuthState(req);
  const scopes = "deals:read,deals:write,persons:read,persons:write,activities:read,activities:write";

  const url = `https://oauth.pipedrive.com/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${encodeURIComponent(state || "")}&response_type=code&scope=${encodeURIComponent(scopes)}`;

  res.status(200).json({ url, newTab: true });
}
