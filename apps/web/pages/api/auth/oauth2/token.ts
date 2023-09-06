import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Invalid method" });
    return;
  }

  const clientSecret = "asdfasdf";
  const clientId = "gksldf";

  const client = await prisma.oauthClient.findFirst({
    where: {
      clientId: clientId,
    },
  });

  if (client.secret !== hashAPIKey(clientSecret)) {
    res.status(401).json({ message: "Invalid client secret" });
    return;
  }

  //return jwt token here
  res.status(200).json({ access_token: "test" });
}
