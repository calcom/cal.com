import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricEncrypt } from "@calcom/lib/crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const token = encodeURIComponent(
    symmetricEncrypt(JSON.stringify(req.body), process.env.CALENDSO_ENCRYPTION_KEY || "")
  );

  res.status(200).json({ token });
}
