import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";

// If feature flag is disabled, return not found on getServerSideProps
export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const session = await getServerSession({ req: context.req });
  const flags = await getFeatureFlagMap(prisma, session?.user);

  if (flags.insights === false) {
    return {
      notFound: true,
    } as const;
  }

  return { props: {} };
};
