import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import { appKeysSchema } from "../zod";

const LAWPAY_API = "https://api.lawpay.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).json({ error: "Missing code or state" });
  }

  const userId = parseInt(state as string, 10);
  const credential = await prisma.credential.findFirst({
    where: { userId, type: "lawpay_payment" },
  });

  if (!credential) {
    return res.status(404).json({ error: "Credential not found" });
  }

  const appKeys = await prisma.app.findUnique({
    where: { slug: "lawpay" },
    select: { keys: true },
  });

  const keys = appKeysSchema.parse(appKeys?.keys);

  // Exchange code for access token
  const tokenRes = await fetch(`${LAWPAY_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: keys.client_id,
      client_secret: keys.client_secret,
      grant_type: "authorization_code",
      scope: "payments",
      redirect_uri: `${WEBAPP_URL}/api/integrations/lawpay/callback`,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return res.status(400).json({ error: "Failed to exchange code for token" });
  }

  const { access_token } = await tokenRes.json();

  // Get gateway credentials
  const credsRes = await fetch(`${LAWPAY_API}/gateway-credentials`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!credsRes.ok) {
    return res.status(400).json({ error: "Failed to get gateway credentials" });
  }

  const gatewayCreds = await credsRes.json();
  const account = gatewayCreds.live_accounts?.[0] || gatewayCreds.test_accounts?.[0];

  if (!account) {
    return res.status(400).json({ error: "No merchant account found" });
  }

  await prisma.credential.update({
    where: { id: credential.id },
    data: {
      key: {
        client_id: keys.client_id,
        client_secret: keys.client_secret,
        account_id: account.id,
        public_key: account.public_key,
        secret_key: account.secret_key,
      },
    },
  });

  res.redirect("/apps/lawpay/setup?success=true");
}
