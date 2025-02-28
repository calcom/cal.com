import { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import NoMeetingFound from "~/videos/views/videos-no-meeting-found-single-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("no_meeting_found"), t("no_meeting_found"));
};

const ServerPage = async ({ params }: PageProps) => {
  return <NoMeetingFound />;
};

export default ServerPage;
