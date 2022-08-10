import merge from "lodash/merge";
import { NextSeo, NextSeoProps } from "next-seo";
import React from "react";

import { getBrowserInfo } from "@calcom/lib/browser/browser.utils";
import { seoConfig, getSeoImage, HeadSeoProps } from "@calcom/lib/next-seo.config";

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

const constructImage = (name: string, description: string, username: string): string => {
  return (
    encodeURIComponent("Meet **" + name + "** <br>" + description).replace(/'/g, "%27") +
    ".png?md=1&images=https%3A%2F%2Fcal.com%2Flogo-white.svg&images=" +
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBAPP_URL) +
    "/" +
    username +
    "/avatar.png"
  );
};

export const HeadSeo = (props: HeadSeoProps): JSX.Element => {
  const defaultUrl = getBrowserInfo()?.url;
  const image = getSeoImage("default");

  const {
    title,
    description,
    name = null,
    username = null,
    siteName,
    canonical = defaultUrl,
    nextSeoProps = {},
  } = props;

  const truncatedDescription = description.length > 24 ? description.substring(0, 23) + "..." : description;
  const pageTitle = title + " | Cal.com";
  let seoObject = buildSeoMeta({
    title: pageTitle,
    image,
    description: truncatedDescription,
    canonical,
    siteName,
  });

  if (name && username) {
    const pageImage = getSeoImage("ogImage") + constructImage(name, truncatedDescription, username);
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
