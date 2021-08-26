import { DefaultSeoProps } from "next-seo";
import { GenericPageSeoProps } from "@components/seo/generic-page-seo";

const seoImages = {
  default: "https://calendso.com/og-image.png",
  ogImage: "https://og-image-one-pi.vercel.app/",
};

export const getSeoImage = (key: keyof typeof seoImages): string => {
  return seoImages[key];
};

export const seoConfig: {
  genericPageSeo: Required<Pick<GenericPageSeoProps, "siteName">>;
  defaultNextSeo: DefaultSeoProps;
} = {
  genericPageSeo: {
    siteName: "Calendso",
  },
  defaultNextSeo: {
    twitter: {
      handle: "@calendso",
      site: "@Calendso",
      cardType: "summary_large_image",
    },
  },
} as const;
