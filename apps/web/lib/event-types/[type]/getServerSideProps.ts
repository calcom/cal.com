import { createRouterCaller } from "app/_trpc/context";
import type { GetServerSidePropsContext } from "next";
import { redirect, notFound } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { RouterOutputs } from "@calcom/trpc";
import { eventTypesRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/_router";

import { asStringOrThrow } from "@lib/asStringOrNull";

export type PageProps = {
  type: number;
  data: RouterOutputs["viewer"]["eventTypes"]["get"];
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, query } = context;

  const session = await getServerSession({ req });

  const typeParam = parseInt(asStringOrThrow(query.type));

  if (Number.isNaN(typeParam)) {
    return notFound();
  }

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }
  const getEventTypeById = async (eventTypeId: number) => {
    const caller = await createRouterCaller(eventTypesRouter);

    try {
      return await caller.get({ id: eventTypeId });
    } catch (e: unknown) {
      logger.error(safeStringify(e));
      // reject, user has no access to this event type.
      return null;
    }
  };
  const data = await getEventTypeById(typeParam);
  if (!data?.eventType) {
    return redirect("/event-types");
  }
  return {
    data,
    type: typeParam,
  };
};
