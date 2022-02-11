import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { getSession } from "@lib/auth";
import { BASE_URL } from "@lib/config/constants";
import prisma from "@lib/prisma";

const client_id = process.env.TANDEM_CLIENT_ID;
const TANDEM_BASE_URL = process.env.TANDEM_BASE_URL;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Check that user is authenticated
    const session = await getSession({ req });

    if (!session?.user?.id) {
      res.status(401).json({ message: "You must be logged in to do this" });
      return;
    }

    // Get user
    await prisma.user.findFirst({
      rejectOnNotFound: true,
      where: {
        id: session?.user?.id,
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
