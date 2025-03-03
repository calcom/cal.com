import type { GetServerSidePropsResult } from "next";

import { getFeatureFlag } from "@calcom/features/flags/server/utils";
import prisma from "@calcom/prisma";

export const getServerSideProps = async (): Promise<GetServerSidePropsResult<{ isOrg: boolean }>> => {
  const organizations = await getFeatureFlag(prisma, "organizations");
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
