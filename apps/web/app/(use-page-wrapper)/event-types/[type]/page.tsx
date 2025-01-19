import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import type { PageProps as EventTypePageProps } from "@lib/event-types/[type]/getServerSideProps";
import { getServerSideProps } from "@lib/event-types/[type]/getServerSideProps";

import EventTypePageWrapper from "~/event-types/views/event-types-single-view";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const { eventType } = await getData(legacyCtx);

  return await _generateMetadata(
    (t) => `${eventType.title} | ${t("event_type")}`,
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
