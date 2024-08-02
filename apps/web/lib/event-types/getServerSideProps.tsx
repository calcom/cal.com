import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { ENABLE_INFINITE_EVENT_TYPES_FOR_ORG } from "@calcom/lib/constants";

import { ssrInit } from "@server/lib/ssr";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  const session = await getServerSession({ req: context.req, res: context.res });

  if (!session) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }

  const isInfiniteScrollEnabled = session.user?.org?.slug
    ? ENABLE_INFINITE_EVENT_TYPES_FOR_ORG.includes(session.user.org.slug)
    : false;

  return { props: { trpcState: ssr.dehydrate(), isInfiniteScrollEnabled } };
};
