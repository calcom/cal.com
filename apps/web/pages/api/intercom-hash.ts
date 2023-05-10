import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { defaultHandler } from "@calcom/lib/server";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession({ req, res });
  const secret = process.env.INTERCOM_SECRET;

  if (!session) {
    return res.status(401).json({ message: "user not authenticated" });
  }

  if (!secret) {
    return res.status(400).json({ message: "Intercom Identity Verification secret not set" });
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(String(session.user.id));
  const hash = hmac.digest("hex");

  return res.status(200).json({ hash });
}

export default defaultHandler({
  GET: Promise.resolve({ default: handler }),
});
