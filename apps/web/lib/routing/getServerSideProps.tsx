import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";

import { ssrInit } from "@server/lib/ssr";

export const getServerSideProps = async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession({ req: context.req });
  if (!session?.user) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }
  const ssr = await ssrInit(context);
  const filters = getTeamsFiltersFromQuery(context.query);

  await ssr.viewer.appRoutingForms.forms.prefetch({
    filters,
  });
  // Prefetch this so that New Button is immediately available
  await ssr.viewer.teamsAndUserProfilesQuery.prefetch();
  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};
