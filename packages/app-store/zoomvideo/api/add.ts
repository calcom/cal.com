import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

let client_id = "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Get user
    await prisma.user.findFirst({
      rejectOnNotFound: true,
      where: {
        id: req.session?.user?.id,
      },
      select: {
        id: true,
      },
    });

    const appKeys = await getAppKeysFromSlug("zoom");
    if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
    if (!client_id) return res.status(400).json({ message: "Zoom client_id missing." });

    const params = {
      response_type: "code",
      client_id,
      redirect_uri: WEBAPP_URL + "/api/integrations/zoomvideo/callback",
    };
    const query = stringify(params);
    const url = `https://zoom.us/oauth/authorize?${query}`;
    res.status(200).json({ url });
  }
}
