import { withAppDirSsr } from "app/WithAppDirSsr";
import type { Params, SearchParams } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { APP_NAME } from "@calcom/lib/constants";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import EventTypePageWrapper from "~/event-types/views/event-types-single-view";
import { getServerSideProps } from "~/event-types/views/event-types-single-view.getServerSideProps";

export const generateMetadata = async ({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const { eventType } = await getData(legacyCtx);

  return await _generateMetadata(
    (t) => `${eventType.title} | ${t("event_type")} | ${APP_NAME}`,
    () => ""
  );
};

const getData = withAppDirSsr(getServerSideProps);

export default WithLayout({ getLayout: null, getData, Page: EventTypePageWrapper })<"P">;
