import merge from "lodash/merge";
import { NextSeo, NextSeoProps } from "next-seo";
import React from "react";

import { getSeoImage, seoConfig } from "@lib/config/next-seo.config";
import { getBrowserInfo } from "@lib/core/browser/browser.utils";

export type HeadSeoProps = {
  title: string;
  description: string;
  siteName?: string;
  name?: string;
  url?: string;
  username?: string;
  canonical?: string;
  nextSeoProps?: NextSeoProps;
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

const constructImage = (name: string, description: string, username: string): string => {
  return (
    encodeURIComponent("Meet **" + name + "** <br>" + description).replace(/'/g, "%27") +
    ".png?md=1&images=https%3A%2F%2Fcal.com%2Flogo-white.svg&images=" +
    (process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL) +
    "/" +
    username +
    "/avatar.png"
  );
};

export const HeadSeo: React.FC<HeadSeoProps & { children?: never }> = (props) => {
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
