// import fs from "fs";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });

  if (!session) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const decoded = req.body.avatar.toString().replace("data:image/png;base64,", "");
  const imageResp = new Buffer(decoded, "base64");
  console.log("imageResp=>", imageResp);
  //   const imageBuffer = fs.readFileSync(req.body.avatar);
  res.setHeader("Content-Type", "image/png");
  res.send(imageResp);
}
