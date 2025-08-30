import type { DefaultSeoProps, NextSeoProps } from "next-seo";

import { APP_NAME, SEO_IMG_DEFAULT, SEO_IMG_OGIMG } from "@calcom/lib/constants";

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

const seoImages = {
  default: SEO_IMG_DEFAULT,
  ogImage: SEO_IMG_OGIMG,
};

export const getSeoImage = (key: keyof typeof seoImages): string => {
  return seoImages[key];
};

export const seoConfig: {
  headSeo: Required<Pick<HeadSeoProps, "siteName">>;
  defaultNextSeo: DefaultSeoProps;
} = {
  headSeo: {
    siteName: APP_NAME,
  },
  defaultNextSeo: {
    twitter: {
      handle: "@calcom",
      site: "@calcom",
      cardType: "summary_large_image",
    },
  },
} as const;
