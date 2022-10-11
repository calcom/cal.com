import merge from "lodash/merge";
import { NextSeo, NextSeoProps } from "next-seo";

import { getSeoImage, seoConfig } from "@lib/config/next-seo.config";
import { getBrowserInfo } from "@lib/core/browser/browser.utils";

export type HeadSeoProps = {
  title: string;
  description: string;
  siteName?: string;
  name?: string;
  url?: string;
  usernames?: string[];
  canonical?: string;
  nextSeoProps?: NextSeoProps;
  app?: { name: string; slug: string; description: string };
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

interface MeetingImageProps {
  title: string;
  name: string;
  usernames: string[];
}

const constructMeetingImage = ({ title, name, usernames }: MeetingImageProps): string => {
  return [
    `?type=meeting`,
    `&title=${encodeURIComponent(title)}`,
    `&name=${encodeURIComponent(name)}`,
    `${usernames.map((username) => `&users=${encodeURIComponent(username)}`)}`,
    // Joinining a multiline string for readability.
  ].join("");
};

interface AppImageProps {
  name: string;
  slug: string;
  description: string;
}

const constructAppImage = ({ name, slug, description }: AppImageProps): string => {
  return [
    `?type=app`,
    `&name=${encodeURIComponent(name)}`,
    `&slug=${encodeURIComponent(slug)}`,
    `&description=${encodeURIComponent(description)}`,
    // Joinining a multiline string for readability.
  ].join("");
};

export const HeadSeo = (props: HeadSeoProps): JSX.Element => {
  const defaultUrl = getBrowserInfo()?.url;
  const image = getSeoImage("default");

  const {
    title,
    description,
    name = null,
    usernames = null,
    siteName,
    canonical = defaultUrl,
    nextSeoProps = {},
    app,
  } = props;

  const truncatedDescription = description.length > 24 ? description.substring(0, 23) + "..." : description;
  const longerTruncatedDescription =
    description.length > 48 ? description.substring(0, 47) + "..." : description;
  const pageTitle = title + " | Cal.com";
  let seoObject = buildSeoMeta({
    title: pageTitle,
    image,
    description: truncatedDescription,
    canonical,
    siteName,
  });

  if (name && usernames) {
    const pageImage = getSeoImage("ogImage") + constructMeetingImage({ title, name, usernames });
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
      getSeoImage("ogImage") + constructAppImage({ ...app, description: longerTruncatedDescription });
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
