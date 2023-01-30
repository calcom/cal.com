import merge from "lodash/merge";
import { NextSeo, NextSeoProps } from "next-seo";
import { useRouter } from "next/router";

import {
  AppImageProps,
  constructAppImage,
  constructGenericImage,
  constructMeetingImage,
  MeetingImageProps,
} from "@calcom/lib/OgImages";
import { getBrowserInfo } from "@calcom/lib/browser/browser.utils";
import { APP_NAME } from "@calcom/lib/constants";
import { seoConfig, getSeoImage } from "@calcom/lib/next-seo.config";
import { truncateOnWord } from "@calcom/lib/text";

export type HeadSeoProps = {
  title: string;
  description: string;
  siteName?: string;
  url?: string;
  canonical?: string;
  nextSeoProps?: NextSeoProps;
  app?: AppImageProps;
  meeting?: MeetingImageProps;
};

/**
 * Build full seo tags from title, desc, canonical and url
 */
const buildSeoMeta = (pageProps: {
  title: string;
  description: string;
  image: string;
  siteName?: string;
  url?: string;
  canonical?: string;
}): NextSeoProps => {
  const { title, description, image, canonical, siteName = seoConfig.headSeo.siteName } = pageProps;
  return {
    title: title,
    canonical: canonical,
    openGraph: {
      site_name: siteName,
      type: "website",
      title: title,
      description: description,
      images: [
        {
          url: image,
        },
      ],
    },
    additionalMetaTags: [
      {
        property: "name",
        content: title,
      },
      {
        property: "description",
        content: description,
      },
      {
        name: "description",
        content: description,
      },
      {
        property: "image",
        content: image,
      },
    ],
  };
};

export const HeadSeo = (props: HeadSeoProps): JSX.Element => {
  // build the canonical url to ensure it's always cal.com (not app.cal.com)
  const router = useRouter();
  // compose the url with only the router's path (e.g. /apps/zapier) such that on app.cal.com the canonical is still cal.com
  const calcomUrl = (`https://cal.com` + (router.asPath === "/" ? "" : router.asPath)).split("?")[0]; // cut off search params
  // avoid setting cal.com canonicals on self-hosted apps. Note: isCalcom or IS_SELF_HOSTED from @calcom/lib do not handle https:cal.com
  const isCalcom = new URL(process.env.WEBAPP_URL).hostname.endsWith("cal.com")
  const defaultUrl = isCalcom ? calcomUrl : getBrowserInfo()?.url;

  const { title, description, siteName, canonical = defaultUrl, nextSeoProps = {}, app, meeting } = props;

  const image = getSeoImage("ogImage") + constructGenericImage({ title, description });
  const truncatedDescription = truncateOnWord(description, 158);
  const pageTitle = title + " | " + APP_NAME;
  let seoObject = buildSeoMeta({
    title: pageTitle,
    image,
    description: truncatedDescription,
    canonical,
    siteName,
  });

  if (meeting) {
    const pageImage = getSeoImage("ogImage") + constructMeetingImage(meeting);
    seoObject = buildSeoMeta({
      title: pageTitle,
      description: truncatedDescription,
      image: pageImage,
      canonical,
      siteName,
    });
  }

  if (app) {
    const pageImage =
      getSeoImage("ogImage") + constructAppImage({ ...app, description: truncatedDescription });
    seoObject = buildSeoMeta({
      title: pageTitle,
      description: truncatedDescription,
      image: pageImage,
      canonical,
      siteName,
    });
  }

  const seoProps: NextSeoProps = merge(nextSeoProps, seoObject);

  return <NextSeo {...seoProps} />;
};

export default HeadSeo;
