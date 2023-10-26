import NotFoundPage from "@pages/404";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { cookies, headers } from "next/headers";

import { getLocale } from "@calcom/features/auth/lib/getLocale";

import PageWrapper from "@components/PageWrapperAppDir";

const getProps = async (h: ReturnType<typeof headers>, c: ReturnType<typeof cookies>) => {
  // @ts-expect-error we cannot access ctx.req in app dir, however headers and cookies are only properties needed to extract the locale
  const locale = await getLocale({ headers: h, cookies: c });

  const i18n = (await serverSideTranslations(locale)) || "en";

  return {
    i18n,
  };
};

const NotFound = async () => {
  const h = headers();
  const c = cookies();

  const nonce = h.get("x-nonce") ?? undefined;

  const { i18n } = await getProps(h, c);

  return (
    // @ts-expect-error withTrpc expects AppProps
    <PageWrapper requiresLicense={false} pageProps={{ i18n }} nonce={nonce} themeBasis={null} i18n={i18n}>
      <NotFoundPage />
    </PageWrapper>
  );
};

export default NotFound;
