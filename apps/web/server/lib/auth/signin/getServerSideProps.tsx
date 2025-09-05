import type { GetServerSidePropsContext } from "next";
import { getCsrfToken, getProviders } from "next-auth/react";

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
