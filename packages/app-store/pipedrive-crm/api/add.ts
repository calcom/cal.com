import type { NextApiRequest, NextApiResponse } from "next";

import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import appConfig from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });
  const appKeys = await getAppKeysFromSlug(appConfig.slug);
  let client_id = "";
  if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
  if (!client_id) return res.status(400).json({ message: "pipedrive client id missing." });
  // Check that user is authenticated
  req.session = await getServerSession({ req });
  const { teamId } = req.query;
  const user = req.session?.user;
  if (!user) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }
  const userId = user.id;

  const redirect_url = `${WEBAPP_URL}/api/integrations/${appConfig.slug}/callback`;
  // const redirect_url = `https://cagily-puisne-kingsley.ngrok-free.dev/api/apps/${appConfig.slug}/callback`;

  const tenantId = teamId ? teamId : userId;
  res.status(200).json({
    url: `https://oauth.pipedrive.com/oauth/authorize?client_id=${appKeys.client_id}&redirect_uri=${redirect_url}&state={%22tenantId%22:%22${tenantId}%22,%22revertPublicToken%22:%22${process.env.REVERT_PUBLIC_TOKEN}%22}`,
    newTab: true,
  });
}
