import type { GetServerSidePropsContext } from "next";
import { getProviders, getCsrfToken } from "next-auth/react";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const csrfToken = await getCsrfToken(context);
  const providers = await getProviders();
  return {
    props: {
      csrfToken,
      providers,
    },
  };
}
