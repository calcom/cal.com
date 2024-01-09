import LegacyPage from "@pages/video/no-meeting-found";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import type { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { ssrInit } from "@server/lib/ssr";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("no_meeting_found"),
    (t) => t("no_meeting_found")
  );

const getData = async (context: ReturnType<typeof buildLegacyCtx>) => {
  // @ts-expect-error Argument of type '{ query: Params; params: Params; req: { headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }; }' is not assignable to parameter of type 'GetServerSidePropsContext'.
  const ssr = await ssrInit(context);

  return {
    dehydratedState: ssr.dehydrate(),
  };
};

export default WithLayout({ getData, Page: LegacyPage, getLayout: null })<"P">;
