import type { GetServerSidePropsContext } from "next";

import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const flags = await getFeatureFlagMap(prisma);
  // Check if organizations are enabled
  if (flags["organizations"] !== true) {
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
