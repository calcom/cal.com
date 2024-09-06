import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import NoMeetingFound from "~/videos/views/videos-no-meeting-found-single-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("no_meeting_found"),
    (t) => t("no_meeting_found")
  );

export default WithLayout({ Page: NoMeetingFound, getLayout: null })<"P">;
