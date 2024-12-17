import { type TFunction } from "i18next";
import i18next from "i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { headers } from "next/headers";

import { constructGenericImage } from "@calcom/lib/OgImages";
import { IS_CALCOM, WEBAPP_URL, APP_NAME, SEO_IMG_OGIMG } from "@calcom/lib/constants";
import { truncateOnWord } from "@calcom/lib/text";
//@ts-expect-error no type definitions
import config from "@calcom/web/next-i18next.config";

const create = async (locale: string, ns: string) => {
  const { _nextI18Next } = await serverSideTranslations(locale, [ns], config);

  const _i18n = i18next.createInstance();
  _i18n.init({
    lng: locale,
    resources: _nextI18Next?.initialI18nStore,
    fallbackLng: _nextI18Next?.userConfig?.i18n.defaultLocale,
  });
  return _i18n;
};

export const getFixedT = async (locale: string, ns = "common") => {
  const i18n = await create(locale, ns);

  return i18n.getFixedT(locale, ns);
};

export const getTranslate = async () => {
  const headersList = await headers();
  // If "x-locale" does not exist in header,
  // ensure that config.matcher in middleware includes the page you are testing
  const locale = headersList.get("x-locale");
  const t = await getFixedT(locale ?? "en");
  return t;
};

export const _generateMetadata = async (
  getTitle: (t: TFunction<string, undefined>) => string,
  getDescription: (t: TFunction<string, undefined>) => string,
  excludeAppNameFromTitle?: boolean
) => {
  const h = headers();
  const canonical = h.get("x-pathname") ?? "";
  const locale = h.get("x-locale") ?? "en";

  const t = await getFixedT(locale, "common");

  const title = getTitle(t);
  const description = getDescription(t);

  const metadataBase = new URL(IS_CALCOM ? "https://cal.com" : WEBAPP_URL);

  const image =
    SEO_IMG_OGIMG +
    constructGenericImage({
      title,
      description,
    });

  const titleSuffix = `| ${APP_NAME}`;
  const displayedTitle =
    title.includes(titleSuffix) || excludeAppNameFromTitle ? title : `${title} ${titleSuffix}`;

  return {
    title: title.length === 0 ? APP_NAME : displayedTitle,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      description: truncateOnWord(description, 158),
      url: canonical,
      type: "website",
      siteName: APP_NAME,
      title,
      images: [image],
    },
    metadataBase,
  };
};
