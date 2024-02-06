import PageWrapper, { type CalPageWrapper } from "@components/PageWrapper";

import VideosSingleView from "~/videos/views/videos-single-view";

export { getServerSideProps, type PageProps } from "~/videos/views/videos-single-view.getServerSideProps";

const VideosSinglePage = VideosSingleView as unknown as CalPageWrapper;

VideosSinglePage.PageWrapper = PageWrapper;

export default VideosSinglePage;
