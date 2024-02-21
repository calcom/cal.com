import type { NextApiRequest, NextApiResponse } from "next";

import { APP_CREDENTIAL_SHARING_ENABLED } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

// const appCredentialSyncRequestBodySchema = z.object({
//   // UserId of the cal.com user
//   userId: z.number().int(),
//   appSlug: z.string(),
//   // Keys should be AES256 encrypted with the CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY
//   keys: z.string(),
// });

async function authMiddleware(req: NextApiRequest, res: NextApiResponse) {
  if (!APP_CREDENTIAL_SHARING_ENABLED) {
    return res.status(403).json({ message: "Credential sharing is not enabled" });
  }

  if (
    req.headers[process.env.CALCOM_CREDENTIAL_SYNC_HEADER_NAME || "calcom-webhook-secret"] !==
    process.env.CALCOM_CREDENTIAL_SYNC_SECRET
  ) {
    return res.status(403).json({ message: "Invalid webhook secret" });
  }

  //   const reqBody = appCredentialSyncRequestBodySchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.body.userId } });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
}

export default authMiddleware;
