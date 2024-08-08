import { tenant } from "@teamhanko/passkeys-next-auth-provider";
import type { NextApiRequest, NextApiResponse } from "next";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

const tenantId = process.env.NEXT_PUBLIC_HANKO_PASSKEYS_TENANT_ID ?? "";
const apiKey = process.env.HANKO_PASSKEYS_API_KEY ?? "";

const passkeyApi = tenant({ tenantId, apiKey });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!tenantId || !apiKey) {
    return res.status(501).json({ message: "Passkey API not configured" });
  }

  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const credentialId = req.body?.credentialId;
  if (!credentialId) {
    return res.status(400).json({ message: "Missing credential id" });
  }

  const session = await getServerSession({ req, res });
  if (!session) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (!session.user?.id) {
    console.error("Session is missing a user id.");
    return res.status(500).json({ error: ErrorCode.InternalServerError });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    console.error(`Session references user that no longer exists.`);
    return res.status(401).json({ message: "Not authenticated" });
  }

  await passkeyApi.credential(credentialId).remove();

  return res.status(200).json({});
}
