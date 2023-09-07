import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { getSlugOrRequestedSlug, orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { AVATAR_FALLBACK } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import prisma from "@calcom/prisma";

const querySchema = z
  .object({
    username: z.string(),
    teamname: z.string(),
    orgSlug: z.string(),
    /**
     * Allow fetching avatar of a particular organization
     * Avatars being public, we need not worry about others accessing it.
     */
    orgId: z.string().transform((s) => Number(s)),
  })
  .partial();

async function getIdentityData(req: NextApiRequest) {
  const { username, teamname, orgId, orgSlug } = querySchema.parse(req.query);
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
      avatar: getPlaceholderAvatar(team?.logo, teamname),
    };
  }
  if (orgSlug) {
    const org = await prisma.team.findFirst({
      where: getSlugOrRequestedSlug(orgSlug),
      select: {
        slug: true,
        logo: true,
        name: true,
      },
    });
    return {
      org: org?.slug,
      name: org?.name,
      email: null,
      avatar: getPlaceholderAvatar(org?.logo, org?.name),
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const identity = await getIdentityData(req);
  const img = identity?.avatar;
  // We cache for one day
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=60");
  // If image isn't set or links to this route itself, use default avatar
  if (!img) {
    if (identity?.org) {
      res.setHeader("x-cal-org", identity.org);
    }
    res.writeHead(302, {
      Location: AVATAR_FALLBACK,
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
