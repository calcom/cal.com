import "../styles/globals.css";
import AppProviders from "@lib/app-providers";
import type { AppProps as NextAppProps } from "next/app";
import { IntlProvider } from "react-intl";
import { DefaultSeo } from "next-seo";
import { useRouter } from "next/router";
import { seoConfig } from "@lib/config/next-seo.config";
import en from "@lib/config/i18n/en";
import es from "@lib/config/i18n/es";

const messages: { [lang: string]: { [id: string]: string } } = {
  en,
  es,
};

// Workaround for https://github.com/vercel/next.js/issues/8592
export type AppProps = NextAppProps & {
  /** Will be defined only is there was an error */
  err?: Error;
};

function MyApp({ Component, pageProps, err }: AppProps) {
  const { locale = "en" } = useRouter();

  return (
    <IntlProvider locale={locale} messages={messages[locale]}>
      <AppProviders>
        <DefaultSeo {...seoConfig.defaultNextSeo} />
        <Component {...pageProps} err={err} />
      </AppProviders>
    </IntlProvider>
  );
}

export default MyApp;
