import { getFeatureFlag } from "@calcom/features/flags/server/utils";

// If feature flag is disabled, return not found on getServerSideProps
export const getServerSideProps = async () => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const insightsEnabled = await getFeatureFlag(prisma, "insights");

  if (!insightsEnabled) {
    return {
      notFound: true,
    } as const;
  }

  return { props: {} };
};
