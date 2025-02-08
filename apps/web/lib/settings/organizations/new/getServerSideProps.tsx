import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";

import { getFeatureFlag } from "@calcom/features/flags/server/utils";

export const getServerSideProps = async (
  context: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<{ isOrg?: boolean }>> => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const organizations = await getFeatureFlag(prisma, "organizations");
  // Check if organizations are enabled
  if (!organizations) {
    return {
      notFound: true,
    } as const;
  }
  // <ai_context> We might need to use querySlug but right now this getSErverSideProps fn simpply checks if feature is enabled or not </ai_context>
  const querySlug = context.query.slug as string;

  return {
    props: {
      isOrg: true as boolean,
    },
  };
};
