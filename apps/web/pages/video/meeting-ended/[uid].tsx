import PageWrapper, { type CalPageWrapper } from "@components/PageWrapper";

import MeetingEnded from "~/videos/views/videos-meeting-ended-single-view";

export {
  getServerSideProps,
  type PageProps,
} from "~/videos/views/videos-meeting-ended-single-view.getServerSideProps";

const MeetingEndedPage = MeetingEnded as unknown as CalPageWrapper;

MeetingEndedPage.PageWrapper = PageWrapper;

export default MeetingEndedPage;
