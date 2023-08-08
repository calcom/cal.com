import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { getSlugOrRequestedSlug, orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import prisma from "@calcom/prisma";

import { defaultAvatarSrc } from "@lib/profile";

const querySchema = z
  .object({
    username: z.string(),
    teamname: z.string(),
    /**
     * Allow fetching avatar of a particular organization
     * Avatars being public, we need not worry about others accessing it.
     */
    orgId: z.string().transform((s) => Number(s)),
  })
  .partial();

async function getIdentityData(req: NextApiRequest) {
  const { username, teamname, orgId } = querySchema.parse(req.query);
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(req.headers.host ?? "");

  const org = isValidOrgDomain ? currentOrgDomain : null;

  const orgQuery = orgId
    ? {
        id: orgId,
      }
    : org
    ? getSlugOrRequestedSlug(org)
    : null;

  if (username) {
    const user = await prisma.user.findFirst({
      where: {
        username,
        organization: orgQuery,
      },
      select: { avatar: true, email: true },
    });
    return {
      name: username,
      email: user?.email,
      avatar: user?.avatar,
      org,
    };
  }
  if (teamname) {
    const team = await prisma.team.findFirst({
      where: {
        slug: teamname,
        parent: orgQuery,
      },
      select: { logo: true },
    });
    return {
      org,
      name: teamname,
      email: null,
      avatar: team?.logo || getPlaceholderAvatar(null, teamname),
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const identity = await getIdentityData(req);
  const img = identity?.avatar;
  // If image isn't set or links to this route itself, use default avatar
  if (!img) {
    if (identity?.org) {
      res.setHeader("x-cal-org", identity.org);
    }
    res.writeHead(302, {
      Location: defaultAvatarSrc({
        md5: crypto
          .createHash("md5")
          .update(identity?.email || "guest@example.com")
          .digest("hex"),
      }),
    });

    return res.end();
  }

  if (!img.includes("data:image")) {
    if (identity.org) {
      res.setHeader("x-cal-org", identity.org);
    }
    res.writeHead(302, { Location: img });
    return res.end();
  }

  const decoded = img.toString().replace("data:image/png;base64,", "").replace("data:image/jpeg;base64,", "");
  const imageResp = Buffer.from(decoded, "base64");
  if (identity.org) {
    res.setHeader("x-cal-org", identity.org);
  }
  res.writeHead(200, {
    "Content-Type": "image/png",
    "Content-Length": imageResp.length,
  });
  res.end(imageResp);
}
