import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { APP_NAME } from "@calcom/lib/constants";

import VideosSingleView from "~/videos/views/videos-single-view";
import { getServerSideProps, type PageProps } from "~/videos/views/videos-single-view.getServerSideProps";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => `${APP_NAME} Video`,
    (t) => t("quick_video_meeting")
  );

const getData = withAppDirSsr<PageProps>(getServerSideProps);

export default WithLayout({ getData, Page: VideosSingleView, getLayout: null })<"P">;
