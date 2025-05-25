import type { GetServerSidePropsResult } from "next";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";

export const getServerSideProps = async (): Promise<GetServerSidePropsResult<{ isOrg: boolean }>> => {
  const featuresRepository = new FeaturesRepository();
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
