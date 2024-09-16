import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getFeatureFlag } from "@calcom/features/flags/server/utils";
import { MembershipRole } from "@calcom/prisma/client";

export const getServerSideProps = async ({ req, res }: GetServerSidePropsContext) => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const organizationsEnabled = await getFeatureFlag(prisma, "organizations");
  // Check if organizations are enabled
  if (!organizationsEnabled) {
    return {
      notFound: true,
    };
  }

  // Check if logged in user has an organization assigned
  const session = await getServerSession({ req, res });

  if (!session?.user.profile?.organizationId) {
    return {
      notFound: true,
    };
  }

  // Check if logged in user has OWNER/ADMIN role in organization
  const membership = await prisma.membership.findFirst({
    where: {
      userId: session?.user.id,
      teamId: session?.user.profile.organizationId,
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
