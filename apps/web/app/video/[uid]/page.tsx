import { withAppDirSsr } from "app/WithAppDirSsr";
import { getTranslate } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { APP_NAME, SEO_IMG_OGIMG_VIDEO, WEBSITE_URL } from "@calcom/lib/constants";

import { getServerSideProps } from "@lib/video/[uid]/getServerSideProps";

import type { PageProps } from "~/videos/views/videos-single-view";
import VideosSingleView from "~/videos/views/videos-single-view";

export const generateMetadata = async () => {
  const t = await getTranslate();
  return {
    title: `${APP_NAME} Video`,
    description: t("quick_video_meeting"),
    openGraph: {
      title: `${APP_NAME} Video`,
      description: t("quick_video_meeting"),
      url: `${WEBSITE_URL}/video`,
      images: [
        {
          url: SEO_IMG_OGIMG_VIDEO,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${APP_NAME} Video`,
      description: t("quick_video_meeting"),
      images: [SEO_IMG_OGIMG_VIDEO],
    },
  };
};

const getData = withAppDirSsr<PageProps>(getServerSideProps);

export default WithLayout({ getData, Page: VideosSingleView, getLayout: null })<"P">;
