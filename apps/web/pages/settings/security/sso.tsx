import { GetServerSidePropsContext } from "next";

import { ssrInit } from "@calcom/lib/server/ssr";

export { default } from "@calcom/features/ee/sso/page/user-sso-view";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};
