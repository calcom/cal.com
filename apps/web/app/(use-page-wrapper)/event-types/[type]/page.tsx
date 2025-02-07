import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";

import { buildLegacyCtx, buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps as EventTypePageProps } from "@lib/event-types/[type]/getServerSideProps";
import { getServerSideProps } from "@lib/event-types/[type]/getServerSideProps";

import EventTypePageWrapper from "~/event-types/views/event-types-single-view";

const querySchema = z.object({
  type: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "event-type id must be a string that can be cast to a number",
    })
    .transform((val) => Number(val)),
});

export const generateMetadata = async ({ params }: _PageProps) => {
  const session = await getServerSession({ req: buildLegacyRequest(headers(), cookies()) });
  const parsed = querySchema.safeParse(params);
  if (!parsed.success || !session?.user?.id) {
    return await _generateMetadata(
      (t) => `${t("event_type")}`,
      () => ""
    );
  }

  const data = await EventTypeRepository.findTitleById({
    id: parsed.data.type,
  });

  return await _generateMetadata(
    (t) => (data?.title ? `${data.title} | ${t("event_type")}` : `${t("event_type")}`),
    () => ""
  );
};

const getData = withAppDirSsr<EventTypePageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: _PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const props = await getData(legacyCtx);

  return <EventTypePageWrapper {...props} />;
};

export default ServerPage;
