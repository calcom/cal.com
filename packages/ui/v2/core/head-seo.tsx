import merge from "lodash/merge";
import { NextSeo, NextSeoProps } from "next-seo";

import { constructAppImage, constructMeetingImage } from "@calcom/lib/OgImages";
import { getBrowserInfo } from "@calcom/lib/browser/browser.utils";
import { seoConfig, getSeoImage, HeadSeoProps } from "@calcom/lib/next-seo.config";
import { truncate, truncateOnWord } from "@calcom/lib/text";

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
  const defaultUrl = getBrowserInfo()?.url;
  const image = getSeoImage("default");

  const { title, description, siteName, canonical = defaultUrl, nextSeoProps = {}, app, meeting } = props;

  const truncatedDescription = truncate(description, 24);
  const longerTruncatedDescriptionOnWords = truncateOnWord(description, 148);

  const pageTitle = title + " | Cal.com";
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
      getSeoImage("ogImage") + constructAppImage({ ...app, description: longerTruncatedDescriptionOnWords });
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
