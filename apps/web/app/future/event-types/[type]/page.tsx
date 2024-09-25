import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { EventType } from "@calcom/atoms/monorepo";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/event-types/[type]/getServerSideProps";
import type { PageProps as EventTypePageProps } from "@lib/event-types/[type]/getServerSideProps";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const { eventType } = await getData(legacyCtx);

  return await _generateMetadata(
    (t) => `${eventType.title} | ${t("event_type")}`,
    () => ""
  );
};

const getData = withAppDirSsr(getServerSideProps);
const Page = ({ type, ...rest }: EventTypePageProps) => <EventType {...rest} id={type} isAppDir={true} />;
export default WithLayout({ getLayout: null, getData, Page })<"P">;
