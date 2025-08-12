import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";

import type { NextJsLegacyContext } from "@lib/buildLegacyCtx";

export const getServerSideProps = async (
  _context: NextJsLegacyContext
): Promise<{ props: { isOrg: boolean } } | { notFound: true }> => {
  const featuresRepository = new FeaturesRepository(prisma);
  const organizations = await featuresRepository.checkIfFeatureIsEnabledGlobally("organizations");
  // Check if organizations are enabled
  if (!organizations) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      isOrg: true,
    },
  };
};
