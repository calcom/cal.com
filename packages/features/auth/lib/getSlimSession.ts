import type { GetServerSidePropsContext, NextApiRequest } from "next";
import type { Session } from "next-auth";
import { getToken } from "next-auth/jwt";

import checkLicense from "@calcom/features/ee/common/server/checkLicense";
import { CAL_URL, IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import type { Membership, Team } from "@calcom/prisma/client";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

const UNSTABLE_SESSION_CACHE = new Map<string, Session>();

type UserTeams = {
  teams: Array<
    Membership & {
      team: Team;
    }
  >;
};

const checkIfUserBelongsToActiveTeam = <T extends UserTeams>(user: T) =>
  user.teams.some((m: { team: { metadata: unknown } }) => {
    if (!IS_TEAM_BILLING_ENABLED) {
      return true;
    }

    const metadata = teamMetadataSchema.safeParse(m.team.metadata);

    return metadata.success && metadata.data?.subscriptionId;
  });

export async function getSlimSession(options: {
  req: NextApiRequest | GetServerSidePropsContext["req"];
  secret?: string;
}) {
  const { req, secret } = options;

  const token = await getToken({
    req,
    secret,
  });

  // console.log({ token });

  if (!token || !token.email || !token.sub) {
    return null;
  }

  const cachedSession = UNSTABLE_SESSION_CACHE.get(JSON.stringify(token));

  if (cachedSession) {
    return cachedSession;
  }

  const user = await prisma.user.findUnique({
    where: {
      email: token.email.toLowerCase(),
    },
    include: {
      teams: {
        include: {
          team: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const hasValidLicense = await checkLicense(prisma);
  const belongsToActiveTeam = checkIfUserBelongsToActiveTeam(user);

  const session: Session = {
    hasValidLicense,
    expires: new Date(typeof token.exp === "number" ? token.exp : Date.now()).toISOString(),
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      emailVerified: user.emailVerified,
      email_verified: user.emailVerified !== null,
      role: user.role,
      image: `${CAL_URL}/${user.username}/avatar.png`,
      impersonatedByUID: undefined,
      belongsToActiveTeam,
    },
  };

  UNSTABLE_SESSION_CACHE.set(JSON.stringify(token), session);

  return session;
}
