import type { NextSeoProps } from "next-seo";
import { NextSeo } from "next-seo";
import { usePathname } from "next/navigation";

import type { AppImageProps, MeetingImageProps } from "@calcom/lib/OgImages";
import { constructAppImage, constructGenericImage, constructMeetingImage } from "@calcom/lib/OgImages";
import { APP_NAME, WEBSITE_URL, IS_CALCOM } from "@calcom/lib/constants";
import { seoConfig, getSeoImage, buildCanonical } from "@calcom/lib/next-seo.config";
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
  isBrandingHidden?: boolean;
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
}) => {
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
  const path = usePathname();
  // The below code sets the defaultUrl for our canonical tags
  // Get the router's path
  const selfHostedOrigin = WEBSITE_URL || "https://cal.com";
  // Set the default URL to either the current URL (if self-hosted) or https://cal.com canonical URL
  const defaultUrl = IS_CALCOM
    ? buildCanonical({ path, origin: "https://cal.com" })
    : buildCanonical({ path, origin: selfHostedOrigin });

  const {
    title,
    description,
    siteName,
    canonical = defaultUrl,
    nextSeoProps = {},
    app,
    meeting,
    isBrandingHidden,
  } = props;

  const image = getSeoImage("ogImage") + constructGenericImage({ title, description });
  const truncatedDescription = truncateOnWord(description, 158);
  const pageTitle = `${title}${isBrandingHidden ? "" : ` | ${APP_NAME}`}`;
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

  // Instead of doing a blackbox deep merge which can be tricky implementation wise and need a good implementation, we should generate the object manually as we know the properties
  // Goal is to avoid big dependency
  const seoProps: NextSeoProps = {
    ...nextSeoProps,
    ...seoObject,
    openGraph: {
      ...nextSeoProps.openGraph,
      ...seoObject.openGraph,
      images: [...(nextSeoProps.openGraph?.images || []), ...seoObject.openGraph.images],
    },
    additionalMetaTags: [...(nextSeoProps.additionalMetaTags || [])],
  };

  return <NextSeo {...seoProps} />;
};

export default HeadSeo;
