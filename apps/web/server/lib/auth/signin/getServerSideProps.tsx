import type { GetServerSidePropsContext } from "next";
import { getProviders, getCsrfToken } from "next-auth/react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req } = context;

  const session = await getServerSession({ req });
  const csrfToken = await getCsrfToken(context);
  const providers = await getProviders();
  if (session) {
    return {
      redirect: { destination: "/" },
    };
  }
  return {
    props: {
      csrfToken,
      providers,
    },
  };
}
