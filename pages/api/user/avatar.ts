import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@lib/prisma";
import { defaultAvatarSrc } from "@lib/profile";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  //   const username = req.url?.substring(1, req.url.lastIndexOf("/"));
  const username = req.query.username as string;
  const user = await prisma.user.findUnique({
    where: {
      username: username,
    },
    select: {
      avatar: true,
      email: true,
    },
  });

  const emailMd5 = crypto
    .createHash("md5")
    .update(user?.email as string)
    .digest("hex");
  const img = user?.avatar;
  if (!img) {
    res.writeHead(302, {
      Location: defaultAvatarSrc({ md5: emailMd5 }),
    });
    res.end();
  } else if (!img.includes("data:image")) {
    res.writeHead(302, {
      Location: img,
    });
    res.end();
  } else {
    const decoded = img
      .toString()
      .replace("data:image/png;base64,", "")
      .replace("data:image/jpeg;base64,", "");
    const imageResp = Buffer.from(decoded, "base64");
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": imageResp.length,
    });
    res.end(imageResp);
  }
}
