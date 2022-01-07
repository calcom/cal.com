import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });

  if (!session) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  // Add support for empty req.body.avatar (gravatar)
  let decoded = req.body.avatar.toString().replace("data:image/png;base64,", "");
  decoded = req.body.avatar.toString().replace("data:image/jpeg;base64,", "");
  const imageResp = !req.body.gravatar ? Buffer.from(decoded, "base64") : Buffer.from(decoded, "utf-8");
  console.log("decoded=>", decoded, "++imageResp=>", imageResp);
  res.setHeader("Content-Type", "image/png");
  res.send(imageResp);
}
