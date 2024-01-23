import { getServerSideProps } from "@lib/video/[uid]/getServerSideProps";

import PageWrapper from "@components/PageWrapper";
import JoinCall from "@components/pages/video/[uid]";

export { VideoMeetingInfo, type JoinCallPageProps } from "@components/pages/video/[uid]";

export default JoinCall;

export { getServerSideProps };
JoinCall.PageWrapper = PageWrapper;
