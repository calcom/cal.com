import type { GetServerSidePropsContext } from "next";

import { ssrInit } from "@server/lib/ssr";

export { default } from "@calcom/features/ee/teams/pages/team-appearance-view";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};
