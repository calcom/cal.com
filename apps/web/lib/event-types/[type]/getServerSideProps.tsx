import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { asStringOrThrow } from "@lib/asStringOrNull";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

import { ssrInit } from "@server/lib/ssr";

export type PageProps = inferSSRProps<typeof getServerSideProps>;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, res, query } = context;

  const session = await getServerSession({ req, res });

  const typeParam = parseInt(asStringOrThrow(query.type));
  const ssr = await ssrInit(context);

  if (Number.isNaN(typeParam)) {
    return {
      notFound: true,
    };
  }

  if (!session?.user?.id) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }

  await ssr.viewer.eventTypes.get.prefetch({ id: typeParam });
  return {
    props: {
      type: typeParam,
      trpcState: ssr.dehydrate(),
    },
  };
};
