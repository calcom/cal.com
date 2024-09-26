import PageWrapper from "@components/PageWrapper";

import MeetingEnded, { type PageProps } from "~/videos/views/videos-meeting-ended-single-view";

export { getServerSideProps } from "@lib/video/meeting-ended/[uid]/getServerSideProps";

const MeetingEndedPage = (props: PageProps) => <MeetingEnded {...props} />;

MeetingEndedPage.PageWrapper = PageWrapper;

export default MeetingEndedPage;
