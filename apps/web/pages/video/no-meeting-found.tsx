import PageWrapper, { type CalPageWrapper } from "@components/PageWrapper";

import NoMeetingFound from "~/videos/views/videos-no-meeting-found-single-view";

const NoMeetingFoundPage = NoMeetingFound as unknown as CalPageWrapper;

NoMeetingFoundPage.PageWrapper = PageWrapper;

export default NoMeetingFoundPage;
