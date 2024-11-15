import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { getOAuthClientFromSession } from "../lib/util";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
  // Check that user is authenticated
  req.session = await getServerSession({ req, res });
  if (!req.session) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const { client, tenantId } = await getOAuthClientFromSession(req.session);

  const url = new URL(client.authorizationUrl);
  url.searchParams.append("state", tenantId.toString());

  res.status(200).json({
    url,
  });
}
