import type { GetServerSidePropsResult } from "next";
import type { GetServerSidePropsContext } from "next";
import { getSession } from "next-auth/react";

import { getFeatureFlag } from "@calcom/features/flags/server/utils";
import prisma from "@calcom/prisma";

export const getServerSideProps = async (
  ctx: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<{ isOrg: boolean }>> => {
  const session = await getSession(ctx);

  if (!session || !session.user) {
    return {
      redirect: {
        destination: `/login?callbackUrl=${ctx.req.headers["x-url"]}`,
        permanent: false,
      },
    };
  }

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
