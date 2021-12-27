import { DefaultSeoProps } from "next-seo";

import { HeadSeoProps } from "@components/seo/head-seo";

const seoImages = {
  default: "/the-skills-logo-black.png",
  ogImage: "https://og-image-one-pi.vercel.app/",
};

export const getSeoImage = (key: keyof typeof seoImages): string => {
  return seoImages[key];
};

export const seoConfig: {
  headSeo: Required<Pick<HeadSeoProps, "siteName">>;
  defaultNextSeo: DefaultSeoProps;
} = {
  headSeo: {
    siteName: "The Skills",
  },
  defaultNextSeo: {
    twitter: {
      handle: "@theskills",
      site: "@theskills",
      cardType: "summary_large_image",
    },
  },
} as const;
