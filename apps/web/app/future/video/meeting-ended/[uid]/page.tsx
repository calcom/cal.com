import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import MeetingEnded from "~/videos/views/videos-meeting-ended-single-view";
import { getServerSideProps } from "~/videos/views/videos-meeting-ended-single-view.getServerSideProps";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Meeting Unavailable",
    () => "Meeting Unavailable"
  );

const getData = withAppDirSsr(getServerSideProps);

export default WithLayout({ getData, Page: MeetingEnded, getLayout: null })<"P">;
