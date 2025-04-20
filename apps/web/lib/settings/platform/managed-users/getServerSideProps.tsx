import type { GetServerSidePropsContext } from "next";
import type { GetServerSidePropsResult } from "next";
import { getSession } from "next-auth/react";

import { WEBAPP_URL } from "@calcom/lib/constants";

export const getServerSideProps = async (
  ctx: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<Record<string, any>>> => {
  const session = await getSession(ctx);
  const callbackUrl = `${WEBAPP_URL}/settings/platform/managed-users`;

  if (!session || !session.user) {
    return {
      redirect: {
        destination: `/login?callbackUrl=${callbackUrl}`,
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
