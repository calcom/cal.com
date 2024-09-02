import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

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
  const getEventTypeById = async (eventTypeId: number) => {
    await ssr.viewer.eventTypes.get.prefetch({ id: eventTypeId });
    try {
      const { eventType } = await ssr.viewer.eventTypes.get.fetch({ id: eventTypeId });
      return eventType;
    } catch (e: unknown) {
      logger.error(safeStringify(e));
      // reject, user has no access to this event type.
      return null;
    }
  };
  const eventType = await getEventTypeById(typeParam);
  if (!eventType) {
    const redirect = {
      redirect: {
        permanent: false,
        destination: "/event-types",
      },
    } as const;
    return redirect;
  }
  return {
    props: {
      eventType,
      type: typeParam,
      trpcState: ssr.dehydrate(),
    },
  };
};
