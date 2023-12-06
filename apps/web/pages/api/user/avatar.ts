import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import {
  orgDomainConfig,
  whereClauseForOrgWithSlugOrRequestedSlug,
} from "@calcom/features/ee/organizations/lib/orgDomains";
import { AVATAR_FALLBACK } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["team/[slug]"] });
const querySchema = z
  .object({
    username: z.string(),
    teamname: z.string(),
    /**
     * Passed when we want to fetch avatar of a particular organization
     */
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
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(req);

  const org = isValidOrgDomain ? currentOrgDomain : null;

  const orgQuery = orgId
    ? {
        id: orgId,
      }
    : org
    ? whereClauseForOrgWithSlugOrRequestedSlug(org)
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
    const orgs = await prisma.team.findMany({
      where: {
        ...whereClauseForOrgWithSlugOrRequestedSlug(orgSlug),
      },
      select: {
        slug: true,
        logo: true,
        name: true,
      },
    });

    if (orgs.length > 1) {
      // This should never happen, but instead of throwing error, we are just logging to be able to observe when it happens.
      log.error("More than one organization found for slug", orgSlug);
    }

    const org = orgs[0];
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
