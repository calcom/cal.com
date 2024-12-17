import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/video/meeting-ended/[uid]/getServerSideProps";

import type { PageProps } from "~/videos/views/videos-meeting-ended-single-view";
import MeetingEnded from "~/videos/views/videos-meeting-ended-single-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("meeting_unavailable"),
    (t) => t("meeting_unavailable")
  );

const getData = withAppDirSsr<PageProps>(getServerSideProps);

export default WithLayout({ getData, Page: MeetingEnded, getLayout: null })<"P">;
