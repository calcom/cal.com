import PageWrapper, { type CalPageWrapper } from "@components/PageWrapper";

import MeetingNotStarted from "~/videos/views/videos-meeting-not-started-single-view";

export {
  getServerSideProps,
  type PageProps,
} from "~/videos/views/videos-meeting-not-started-single-view.getServerSideProps";

const MeetingNotStartedPage = MeetingNotStarted as unknown as CalPageWrapper;

MeetingNotStartedPage.PageWrapper = PageWrapper;

export default MeetingNotStartedPage;
