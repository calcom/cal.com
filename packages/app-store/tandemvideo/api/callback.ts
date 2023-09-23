import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";

let client_id = "";
let client_secret = "";
let base_url = "https://tandem.chat";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.query.code) {
    res.status(401).json({ message: "Missing code" });
    return;
  }

  const code = req.query.code as string;

  const appKeys = await getAppKeysFromSlug("tandem");
  if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
  if (typeof appKeys.client_secret === "string") client_secret = appKeys.client_secret;
  if (typeof appKeys.base_url === "string") base_url = appKeys.base_url;
  if (!client_id) return res.status(400).json({ message: "Tandem client_id missing." });
  if (!client_secret) return res.status(400).json({ message: "Tandem client_secret missing." });
  if (!base_url) return res.status(400).json({ message: "Tandem base_url missing." });

  const result = await fetch(`${base_url}/api/v1/oauth/v2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, client_id, client_secret }),
  });

  const responseBody = await result.json();

  const userId = req.session?.user.id;
  if (!userId) {
    return res.status(404).json({ message: "No user found" });
  }

  const existingCredentialTandemVideo = await prisma.credential.findMany({
    select: {
      id: true,
    },
    where: {
      type: "tandem_video",
      userId: req.session?.user.id,
      appId: "tandem",
    },
  });

  const credentialIdsToDelete = existingCredentialTandemVideo.map((item) => item.id);
  if (credentialIdsToDelete.length > 0) {
    await prisma.credential.deleteMany({ where: { id: { in: credentialIdsToDelete }, userId } });
  }
  if (result.ok) {
    responseBody.expiry_date = Math.round(Date.now() + responseBody.expires_in * 1000);
    delete responseBody.expires_in;

    await createOAuthAppCredential({ appId: "tandem", type: "tandem_video" }, responseBody, req);

    res.redirect(getInstalledAppPath({ variant: "conferencing", slug: "tandem" }));
  }
}
