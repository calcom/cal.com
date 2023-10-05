import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

let client_id = "";
let base_url = "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Get user
    await prisma.user.findFirstOrThrow({
      where: {
        id: req.session?.user?.id,
      },
      select: {
        id: true,
      },
    });

    const appKeys = await getAppKeysFromSlug("tandem");
    if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
    if (typeof appKeys.base_url === "string") base_url = appKeys.base_url;
    if (!client_id) return res.status(400).json({ message: "Tandem client_id missing." });
    if (!base_url) return res.status(400).json({ message: "Tandem base_url missing." });

    const redirect_uri = encodeURI(`${WEBAPP_URL}/api/integrations/tandemvideo/callback`);

    const params = {
      client_id,
      redirect_uri,
    };
    const query = stringify(params);
    const url = `${base_url}/oauth/approval?${query}`;
    res.status(200).json({ url });
  }
}
