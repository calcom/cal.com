import type { PageProps } from "app/_types";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import type { GetServerSidePropsContext } from "next";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";

import { EventType } from "@calcom/atoms/monorepo";
import { getServerSessionForAppDir } from "@calcom/features/auth/lib/get-server-session-for-app-dir";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import { asStringOrThrow } from "@lib/asStringOrNull";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { ssrInit } from "@server/lib/ssr";

const querySchema = z.object({
  type: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "event-type id must be a string that can be cast to a number",
    })
    .transform((val) => Number(val)),
});

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
    const eventType = await getEventTypeById(
      parseInt(asStringOrThrow(legacyCtx.query.type)),
      legacyCtx
    );
    if (!eventType) {
      redirect("/event-types");
    }
    return await _generateMetadata(
      (t) => `${t("event_type")}`,
      () => ""
    );
  }

  const data = await EventTypeRepository.findTitleById({
    id: parsed.data.type,
  });
};


  return await _generateMetadata(
    (t) => (data?.title ? `${data.title} | ${t("event_type")}` : `${t("event_type")}`),
    () => ""
  );
};

const getEventTypeById = async (eventTypeId: number, context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

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

const ServerPage = async ({ params, searchParams }: PageProps) => {
  const context = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const session = await getServerSessionForAppDir();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const typeParam = parseInt(asStringOrThrow(context.query.type));
  if (Number.isNaN(typeParam)) {
    notFound();
  }

  const eventType = await getEventTypeById(typeParam, context);
  if (!eventType) {
    redirect("/event-types");
  }

  return <EventType {...eventType} id={typeParam} />;
};

export default ServerPage;
