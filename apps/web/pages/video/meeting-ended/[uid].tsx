import PageWrapper from "@components/PageWrapper";

import MeetingEnded, { type PageProps } from "~/videos/views/videos-meeting-ended-single-view";

export { getServerSideProps } from "~/videos/views/videos-meeting-ended-single-view.getServerSideProps";

const MeetingEndedPage = (props: PageProps) => <MeetingEnded {...props} />;

MeetingEndedPage.PageWrapper = PageWrapper;

export default MeetingEndedPage;
