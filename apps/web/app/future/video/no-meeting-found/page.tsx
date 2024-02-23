import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import type { GetServerSidePropsContext } from "next";

import { ssrInit } from "@server/lib/ssr";

import NoMeetingFound from "~/videos/views/videos-no-meeting-found-single-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("no_meeting_found"),
    (t) => t("no_meeting_found")
  );

// ssr was added by Intuita, legacy page does not have it
const getData = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  return {
    dehydratedState: ssr.dehydrate(),
  };
};

export default WithLayout({ getData, Page: NoMeetingFound, getLayout: null })<"P">;
