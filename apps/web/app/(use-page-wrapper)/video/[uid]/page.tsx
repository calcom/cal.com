import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as ServerPageProps } from "app/_types";
import { getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";

import { APP_NAME, SEO_IMG_OGIMG_VIDEO, WEBSITE_URL } from "@calcom/lib/constants";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/video/[uid]/getServerSideProps";

import type { PageProps as ClientPageProps } from "~/videos/views/videos-single-view";
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

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);

  const props = await getData(context);
  return <VideosSingleView {...props} />;
};

export default ServerPage;
