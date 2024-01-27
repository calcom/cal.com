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
    const notFound = {
      notFound: true,
    } as const;

    return notFound;
  }

  if (!session?.user?.id) {
    const redirect = {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    } as const;
    return redirect;
  }

  await ssr.viewer.eventTypes.get.prefetch({ id: typeParam });

  const { eventType } = await ssr.viewer.eventTypes.get.fetch({ id: typeParam });

  return {
    props: {
      eventType,
      type: typeParam,
      trpcState: ssr.dehydrate(),
    },
  };
};
