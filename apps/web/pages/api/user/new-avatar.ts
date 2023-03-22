import md5 from "md5";
import type { NextApiRequest, NextApiResponse } from "next";
import postgres from "postgres";
import { z } from "zod";

import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { defaultResponder } from "@calcom/lib/server";

import { defaultAvatarSrc } from "@lib/profile";

const querySchema = z
  .object({
    username: z.string(),
    teamname: z.string(),
  })
  .partial();

async function getIdentityData(req: NextApiRequest) {
  const { username, teamname } = querySchema.parse(req.query);
  const sql = postgres(process.env.DATABASE_URL || "");
  if (username) {
    const result = await sql<
      {
        email?: string;
        avatar?: string;
      }[]
    >`SELECT ${sql(["id", "email", "avatar"])} 
    FROM "users" WHERE "users"."username" = ${username} LIMIT 1`;
    const [user] = result;

    return {
      name: username,
      email: user?.email,
      avatar: user?.avatar,
    };
  }
  if (teamname) {
    const [team] = await sql<{ id: number; logo: string }[]>`SELECT ${sql(["id", "logo"])}
    FROM "Team" WHERE "Team"."slug" = '${teamname}' LIMIT 1`;

    return {
      name: teamname,
      email: null,
      avatar: team?.logo || getPlaceholderAvatar(null, teamname),
    };
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const identity = await getIdentityData(req);
  const img = identity?.avatar;
  // If image isn't set or links to this route itself, use default avatar
  if (!img) {
    res.writeHead(302, {
      Location: defaultAvatarSrc({
        md5: md5(identity?.email || "guest@example.com"),
      }),
    });
    return res.end();
  }

  if (!img.includes("data:image")) {
    res.writeHead(302, { Location: img });
    return res.end();
  }

  const decoded = img.toString().replace("data:image/png;base64,", "").replace("data:image/jpeg;base64,", "");
  const imageResp = Buffer.from(decoded, "base64");
  res.writeHead(200, {
    "Content-Type": "image/png",
    "Content-Length": imageResp.length,
  });
  res.end(imageResp);
}

export default defaultResponder(handler);
