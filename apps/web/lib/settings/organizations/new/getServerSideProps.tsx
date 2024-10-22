import type { GetServerSidePropsContext } from "next";

import { getFeatureFlag } from "@calcom/features/flags/server/utils";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const organizations = await getFeatureFlag(prisma, "organizations");
  // Check if organizations are enabled
  if (!organizations) {
    return {
      notFound: true,
    } as const;
  }

  const querySlug = context.query.slug as string;

  return {
    props: {
      querySlug: querySlug ?? null,
    },
  };
};
