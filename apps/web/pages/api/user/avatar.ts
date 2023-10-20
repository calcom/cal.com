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
    let user = await prisma.user.findFirst({
      where: {
        username,
        organization: orgQuery,
      },
      select: { avatar: true, email: true },
    });

    /**
     * TEMPORARY CODE STARTS - TO BE REMOVED after mono-user schema is implemented
     * Try the non-org user temporarily to support users part of a team but not part of the organization
     * This is needed because of a situation where we migrate a user and the team to ORG but not all the users in the team to the ORG.
     * Eventually, all users will be migrated to the ORG but this is when user by user migration happens initially.
     */
    // No user found in the org, try the non-org user that might be part of the team that's part of an org
    if (!user && orgQuery) {
      // The only side effect this code could have is that it could serve the avatar of a non-org member from the org domain but as long as the username isn't taken by an org member.
      user = await prisma.user.findFirst({
        where: {
          username,
          organization: null,
        },
        select: { avatar: true, email: true },
      });
    }
    /**
     * TEMPORARY CODE ENDS
     */

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
