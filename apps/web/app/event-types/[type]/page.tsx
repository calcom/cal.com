import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/event-types/[type]/getServerSideProps";

import EventTypePageWrapper from "~/event-types/views/event-types-single-view";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const { eventType } = await getData(legacyCtx);

  return await _generateMetadata(
    (t) => `${eventType.title} | ${t("event_type")}`,
    () => ""
  );
};

const getData = withAppDirSsr(getServerSideProps);

export default WithLayout({ getLayout: null, getData, Page: EventTypePageWrapper })<"P">;
