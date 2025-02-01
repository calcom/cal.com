import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";

import { ssrInit } from "@server/lib/ssr";

export const getServerSideProps = async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req } = context;
  const session = await getServerSession({ req });

  if (!session?.user?.id) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }

  const filters = getTeamsFiltersFromQuery(context.query);
  const ssr = await ssrInit(context);

  await ssr.viewer.appRoutingForms.forms.prefetch({
    filters,
  });
  // Prefetch this so that New Button is immediately available
  await ssr.viewer.teamsAndUserProfilesQuery.prefetch();
  return {
    props: {
      appUrl: "/routing",
      trpcState: ssr.dehydrate(),
    },
  };
};
