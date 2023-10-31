import InsightsPage from "@pages/insights";
import { headers } from "next/headers";

import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { constructGenericImage } from "@calcom/lib/OgImages";
import { IS_CALCOM, WEBAPP_URL, APP_NAME, SEO_IMG_OGIMG } from "@calcom/lib/constants";
import { getFixedT } from "@calcom/lib/server/getFixedT";

import { preparePageMetadata } from "@lib/metadata";

export const generateMetadata = async () => {
  const h = headers();
  const canonical = h.get("x-pathname") ?? "";
  const locale = h.get("x-locale") ?? "en";

  const t = await getFixedT(locale, "common");

  const title = "Insights";
  const description = t("insights_subtitle");

  const metadataBase = new URL(IS_CALCOM ? "https://cal.com" : WEBAPP_URL);

  const image =
    SEO_IMG_OGIMG +
    constructGenericImage({
      title,
      description,
    });

  return preparePageMetadata({
    title,
    canonical,
    image,
    description,
    siteName: APP_NAME,
    metadataBase,
  });
};

// If feature flag is disabled, return not found on getServerSideProps
export const getProps = async () => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const flags = await getFeatureFlagMap(prisma);

  if (flags.insights === false) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
};

export default InsightsPage;
