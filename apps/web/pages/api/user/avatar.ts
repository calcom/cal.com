import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

import { getPlaceholderAvatar } from "@calcom/lib/getPlaceholderAvatar";
import prisma from "@calcom/prisma";

import { defaultAvatarSrc } from "@lib/profile";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  //   const username = req.url?.substring(1, req.url.lastIndexOf("/"));
  const username = req.query.username as string;
  const teamname = req.query.teamname as string;
  let identity;
  if (username) {
    const user = await prisma.user.findUnique({
      where: {
        username: username,
      },
      select: {
        avatar: true,
        email: true,
      },
    });
    identity = {
      name: username,
      email: user?.email,
      avatar: user?.avatar,
    };
  } else if (teamname) {
    const team = await prisma.team.findUnique({
      where: {
        slug: teamname,
      },
      select: {
        logo: true,
      },
    });
    identity = {
      name: teamname,
      shouldDefaultBeNameBased: true,
      avatar: team?.logo,
    };
  }

  const emailMd5 = crypto
    .createHash("md5")
    .update((identity?.email as string) || "guest@example.com")
    .digest("hex");
  const img = identity?.avatar;
  if (!img) {
    let defaultSrc = defaultAvatarSrc({ md5: emailMd5 });
    if (identity?.shouldDefaultBeNameBased) {
      defaultSrc = getPlaceholderAvatar(null, identity.name);
    }
    res.writeHead(302, {
      Location: defaultSrc,
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
