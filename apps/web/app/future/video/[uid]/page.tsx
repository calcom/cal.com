import Page, { type JoinCallPageProps } from "@pages/video/[uid]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { APP_NAME } from "@calcom/lib/constants";

import { getServerSideProps } from "@lib/video/[uid]/getServerSideProps";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => `${APP_NAME} Video`,
    (t) => t("quick_video_meeting")
  );

const getData = withAppDirSsr<JoinCallPageProps>(getServerSideProps);

export default WithLayout({ getData, Page, getLayout: null })<"P">;
