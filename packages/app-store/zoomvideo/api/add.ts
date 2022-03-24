import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { BASE_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

const client_id = process.env.ZOOM_CLIENT_ID;

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

    const params = {
      response_type: "code",
      client_id,
      redirect_uri: BASE_URL + "/api/integrations/zoomvideo/callback",
    };
    const query = stringify(params);
    const url = `https://zoom.us/oauth/authorize?${query}`;
    res.status(200).json({ url });
  }
}
