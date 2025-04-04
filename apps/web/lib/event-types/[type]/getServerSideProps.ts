import { createRouterCaller } from "app/_trpc/context";
import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { eventTypesRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/_router";

import { asStringOrThrow } from "@lib/asStringOrNull";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

export type PageProps = inferSSRProps<typeof getServerSideProps>;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, query } = context;

  const session = await getServerSession({ req });

  const typeParam = parseInt(asStringOrThrow(query.type));

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
    const caller = await createRouterCaller(eventTypesRouter);

    try {
      const { eventType } = await caller.get({ id: eventTypeId });
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
    },
  };
};
