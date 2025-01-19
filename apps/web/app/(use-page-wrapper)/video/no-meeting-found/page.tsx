import { _generateMetadata } from "app/_utils";

import NoMeetingFound from "~/videos/views/videos-no-meeting-found-single-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("no_meeting_found"),
    (t) => t("no_meeting_found")
  );

export default NoMeetingFound;
