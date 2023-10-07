import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import logger from "@calcom/lib/logger";
import { MembershipRole } from "@calcom/prisma/client";

const log = logger.getChildLogger({ prefix: ["[pages/organization]"] });
export const getServerSideProps = async ({ req, res }: GetServerSidePropsContext) => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const flags = await getFeatureFlagMap(prisma);
  // Check if organizations are enabled
  if (flags["organizations"] !== true) {
    log.warn(`"organizations" flag is not enabled`);
    return {
      notFound: true,
    };
  }

  // Check if logged in user has an organization assigned
  const session = await getServerSession({ req, res });
  if (!session?.user.org?.id) {
    log.debug(`User ${session?.user.id} has no organization assigned`);
    return {
      notFound: true,
    };
  }

  // Check if logged in user has OWNER/ADMIN role in organization
  const membership = await prisma.membership.findFirst({
    where: {
      userId: session?.user.id,
      teamId: session?.user.org.id,
    },
    select: {
      role: true,
    },
  });

  if (!membership?.role || membership?.role === MembershipRole.MEMBER) {
    return {
      notFound: true,
    };
  }

  // Otherwise, all good
  return {
    props: {},
  };
};
