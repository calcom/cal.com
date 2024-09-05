import type { Metadata } from "next";

import { APP_NAME } from "@calcom/lib/constants";
import { truncateOnWord } from "@calcom/lib/text";

type RootMetadataRecipe = Readonly<{
  twitterCreator: string;
  twitterSite: string;
  robots: {
    index: boolean;
    follow: boolean;
  };
}>;

export type PageMetadataRecipe = Readonly<{
  title: string;
  canonical: string;
  image: string;
  description: string;
  siteName: string;
  metadataBase: URL;
}>;

export const prepareRootMetadata = (recipe: RootMetadataRecipe): Metadata => ({
  icons: {
    icon: "/favicon.icon",
    apple: "/api/logo?type=apple-touch-icon",
    other: [
      {
        rel: "icon-mask",
        url: "/safari-pinned-tab.svg",
        color: "#000000",
      },
      {
        url: "/api/logo?type=favicon-16",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/api/logo?type=favicon-32",
        sizes: "32x32",
        type: "image/png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0",
  robots: recipe.robots,
  other: {
    "application-TileColor": "#ff0000",
  },
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#f9fafb",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#1C1C1C",
    },
  ],
  twitter: {
    site: recipe.twitterSite,
    creator: recipe.twitterCreator,
    card: "summary_large_image",
  },
});

export const preparePageMetadata = (recipe: PageMetadataRecipe): Metadata => {
  const { title, description } = recipe;
  const titleSuffix = `| ${APP_NAME}`;

  return {
    title: title.length === 0 ? APP_NAME : title.includes(titleSuffix) ? title : `${title} ${titleSuffix}`,
    description,
    alternates: {
      canonical: recipe.canonical,
    },
    openGraph: {
      description: truncateOnWord(description, 158),
      url: recipe.canonical,
      type: "website",
      siteName: recipe.siteName,
      title,
      images: [recipe.image],
    },
    metadataBase: recipe.metadataBase,
  };
};
