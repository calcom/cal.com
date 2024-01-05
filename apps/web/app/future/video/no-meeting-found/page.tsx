import LegacyPage from "@pages/video/no-meeting-found";
import { ssrInit } from "app/_trpc/ssrInit";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("no_meeting_found"),
    (t) => t("no_meeting_found")
  );

const getData = async () => {
  const ssr = await ssrInit();

  return {
    dehydratedState: await ssr.dehydrate(),
  };
};

export default WithLayout({ getData, Page: LegacyPage, getLayout: null })<"P">;
