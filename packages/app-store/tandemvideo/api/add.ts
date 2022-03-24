import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { BASE_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

const client_id = process.env.TANDEM_CLIENT_ID;
const TANDEM_BASE_URL = process.env.TANDEM_BASE_URL;

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

    const redirect_uri = encodeURI(BASE_URL + "/api/integrations/tandemvideo/callback");

    const params = {
      client_id,
      redirect_uri,
    };
    const query = stringify(params);
    const url = `${TANDEM_BASE_URL}/oauth/approval?${query}`;
    res.status(200).json({ url });
  }
}
