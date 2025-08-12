import type { GetServerSidePropsResult } from "next";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";

export const getServerSideProps = async (): Promise<GetServerSidePropsResult<{ isOrg: boolean }>> => {
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
