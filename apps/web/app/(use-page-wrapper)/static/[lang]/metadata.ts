import { constructGenericImage } from "@calcom/lib/OgImages";
import { IS_CALCOM, WEBAPP_URL, APP_NAME, SEO_IMG_OGIMG, CAL_URL } from "@calcom/lib/constants";
import { buildCanonical } from "@calcom/lib/next-seo.config";
import { truncateOnWord } from "@calcom/lib/text";

const _generateMetadataStaticWithoutImage = async (
  pathname: string,
  title: string,
  description: string,
  hideBranding?: boolean,
  origin?: string
) => {
  const canonical = buildCanonical({ path: pathname, origin: origin ?? CAL_URL });
  const titleSuffix = `| ${APP_NAME}`;
  const displayedTitle = title.includes(titleSuffix) || hideBranding ? title : `${title} ${titleSuffix}`;
  const metadataBase = new URL(IS_CALCOM ? "https://cal.com" : WEBAPP_URL);

  return {
    title: title.length === 0 ? APP_NAME : displayedTitle,
    description,
    alternates: { canonical },
    openGraph: {
      description: truncateOnWord(description, 158),
      url: canonical,
      type: "website",
      siteName: APP_NAME,
      title: displayedTitle,
    },
    metadataBase,
  };
};

export const generateMetadataStatic = async (
  pathname: string,
  title: string,
  description: string,
  hideBranding?: boolean,
  origin?: string
) => {
  const metadata = await _generateMetadataStaticWithoutImage(
    pathname,
    title,
    description,
    hideBranding,
    origin
  );
  const image =
    SEO_IMG_OGIMG +
    constructGenericImage({
      title: metadata.title,
      description: metadata.description,
    });

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: [image],
    },
  };
};
