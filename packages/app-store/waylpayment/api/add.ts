/**
 * api/add.ts
 *
 * Route: GET/POST /api/integrations/waylpayment/add
 *
 * GET  — renders the "Connect Wayl" page with an API key input form
 * POST — validates the API key against Wayl, saves it, redirects to app settings
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import { defaultResponder } from "@calcom/lib/server";

import WaylClient from "../lib/WaylClient";

const bodySchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession({ req, res });
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.method === "GET") {
    // Cal.com renders the /apps/waylpayment page from the App Store.
    // This API route is only called when saving. The form lives in
    // components/WaylSetup.tsx — see that file for the UI.
    return res.status(200).json({ ok: true });
  }

  if (req.method === "POST") {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0].message });
    }

    const { apiKey } = parsed.data;

    // 1. Validate the key against the Wayl API before saving
    const client = new WaylClient(apiKey);
    const isValid = await client.verifyKey();
    if (!isValid) {
      return res.status(400).json({ message: "Invalid Wayl API key. Please check your key and try again." });
    }

    // 2. Find or create the Wayl app record in Cal's App table
    const app = await prisma.app.findUnique({ where: { slug: "waylpayment" } });
    if (!app) {
      return res.status(500).json({ message: "Wayl app is not registered. Contact your Cal.com administrator." });
    }

    // 3. Encrypt and store the credential
    const encryptionKey = process.env.CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY;
    const encryptedKey = encryptionKey
      ? symmetricEncrypt(apiKey, encryptionKey)
      : apiKey; // fallback for dev; in prod the env var should always be set

    const existingCredential = await prisma.credential.findFirst({
      where: { userId: session.user.id, appId: app.slug },
    });

    if (existingCredential) {
      await prisma.credential.update({
        where: { id: existingCredential.id },
        data: { key: { apiKey: encryptedKey } },
      });
    } else {
      await prisma.credential.create({
        data: {
          type: "waylpayment_payment",
          key: { apiKey: encryptedKey },
          userId: session.user.id,
          appId: app.slug,
        },
      });
    }

    return res.status(200).json({ url: "/apps/installed/payment" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}

export default defaultResponder(handler);
