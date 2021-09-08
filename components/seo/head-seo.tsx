import { NextSeo, NextSeoProps } from "next-seo";
import React from "react";
import { getBrowserInfo } from "@lib/core/browser/browser.utils";
import { getSeoImage, seoConfig } from "@lib/config/next-seo.config";
import merge from "lodash.merge";

export type HeadSeoProps = {
  title: string;
  description: string;
  siteName?: string;
  name?: string;
  avatar?: string;
  url?: string;
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
          //width: 1077,
          //height: 565,
          //alt: "Alt image"
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

const constructImage = (name: string, avatar: string, description: string): string => {
  return (
    encodeURIComponent("Meet **" + name + "** <br>" + description).replace(/'/g, "%27") +
    ".png?md=1&images=https%3A%2F%2Fcalendso.com%2Fcalendso-logo-white.svg&images=" +
    encodeURIComponent(avatar)
  );
};

export const HeadSeo: React.FC<HeadSeoProps & { children?: never }> = (props) => {
  const defaultUrl = getBrowserInfo()?.url;
  const image = getSeoImage("default");

  const {
    title,
    description,
    name = null,
    avatar = null,
    siteName,
    canonical = defaultUrl,
    nextSeoProps = {},
  } = props;

  const pageTitle = title + " | Calendso";
  let seoObject = buildSeoMeta({ title: pageTitle, image, description, canonical, siteName });

  if (name && avatar) {
    const pageImage = getSeoImage("ogImage") + constructImage(name, avatar, description);
    seoObject = buildSeoMeta({ title: pageTitle, description, image: pageImage, canonical, siteName });
  }

  const seoProps: NextSeoProps = merge(nextSeoProps, seoObject);

  return <NextSeo {...seoProps} />;
};
