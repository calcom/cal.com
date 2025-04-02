import { getTRPCContext } from "app/_trpc/context";
import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { RouterOutputs } from "@calcom/trpc";
import { eventTypesRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/_router";
import { createCallerFactory } from "@calcom/trpc/server/trpc";

import { asStringOrThrow } from "@lib/asStringOrNull";

export type PageProps = {
  type: number;
  eventType: RouterOutputs["viewer"]["eventTypes"]["get"];
};

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
    const trpcContext = await getTRPCContext();
    const createCaller = createCallerFactory(eventTypesRouter);
    const caller = createCaller(trpcContext);
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
