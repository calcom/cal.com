import PageWrapper from "@components/PageWrapper";

import MeetingNotStarted, { type PageProps } from "~/videos/views/videos-meeting-not-started-single-view";

export { getServerSideProps } from "~/videos/views/videos-meeting-not-started-single-view.getServerSideProps";

const MeetingNotStartedPage = (props: PageProps) => <MeetingNotStarted {...props} />;

MeetingNotStartedPage.PageWrapper = PageWrapper;

export default MeetingNotStartedPage;
