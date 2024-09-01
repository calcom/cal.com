import PageWrapper from "@components/PageWrapper";

import VideosSingleView, { type PageProps } from "~/videos/views/videos-single-view";

export { getServerSideProps } from "~/videos/views/videos-single-view.getServerSideProps";

const VideosSinglePage = (props: PageProps) => <VideosSingleView {...props} />;

VideosSinglePage.PageWrapper = PageWrapper;

export default VideosSinglePage;
