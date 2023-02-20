import merge from "lodash/merge";
import type { NextSeoProps } from "next-seo";
import { NextSeo } from "next-seo";
import { useRouter } from "next/router";

import type { AppImageProps, MeetingImageProps } from "@calcom/lib/OgImages";
import { constructAppImage, constructGenericImage, constructMeetingImage } from "@calcom/lib/OgImages";
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
  // The below code sets the defaultUrl for our canonical tags

  // Get the current URL from the window object
  const url = getBrowserInfo()?.url;
  // Check if the URL is from cal.com
  const isCalcom = url && new URL(url).hostname.endsWith("cal.com");
  // Get the router's path
  const path = useRouter().asPath;
  // Build the canonical URL using the router's path, without query parameters. Note: on homepage it omits the trailing slash
  const calcomCanonical = `https://cal.com${path === "/" ? "" : path}`.split("?")[0];
  // Set the default URL to either the current URL (if self-hosted) or https://cal.com canonical URL
  const defaultUrl = isCalcom ? calcomCanonical : url;

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
