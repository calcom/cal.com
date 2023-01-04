import Document, { DocumentContext, Head, Html, Main, NextScript, DocumentProps } from "next/document";
import Script from "next/script";

import { getDirFromLang } from "@calcom/lib/i18n";

type Props = Record<string, unknown> & DocumentProps;

function toRunBeforeReactOnClient() {
  const calEmbedMode = typeof new URL(document.URL).searchParams.get("embed") === "string";
  /* Iframe Name */
  window.name.includes("cal-embed");

  window.isEmbed = () => {
    // Once an embed mode always an embed mode
    return calEmbedMode;
  };

  window.resetEmbedStatus = () => {
    try {
      // eslint-disable-next-line @calcom/eslint/avoid-web-storage
      window.sessionStorage.removeItem("calEmbedMode");
    } catch (e) {}
  };

  window.getEmbedTheme = () => {
    const url = new URL(document.URL);
    return url.searchParams.get("theme") as "dark" | "light";
  };

  window.getEmbedNamespace = () => {
    const url = new URL(document.URL);
    const namespace = url.searchParams.get("embed");
    return namespace;
  };

  window.isPageOptimizedForEmbed = () => {
    // Those pages are considered optimized, which know at backend that they are rendering for embed.
    // Such pages can be shown straightaway without a loader for a better embed experience
    return location.pathname.includes("forms/");
  };
}

class MyDocument extends Document<Props> {
  static async getInitialProps(ctx: DocumentContext) {
    const isEmbed = ctx.asPath?.includes("/embed") || ctx.asPath?.includes("embedType=");
    const initialProps = await Document.getInitialProps(ctx);
    return { isEmbed, ...initialProps };
  }

  render() {
    const { locale } = this.props.__NEXT_DATA__;
    const dir = getDirFromLang(locale);
    return (
      <Html lang={locale} dir={dir}>
        <Head>
          <link rel="preload" href="/cal.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
          <link rel="manifest" href="/site.webmanifest" />
          <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#000000" />
          <meta name="msapplication-TileColor" content="#ff0000" />
          <meta name="theme-color" content="#ffffff" />
          <link
            rel="preload"
            href="/fonts/Inter-roman.var.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
          <link rel="preload" href="/fonts/cal.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
          {/* Define isEmbed here so that it can be shared with App(embed-iframe) as well as the following code to change background and hide body
            Persist the embed mode in sessionStorage because query param might get lost during browsing.
          */}
          <Script
            id="run-before-client"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `(${toRunBeforeReactOnClient.toString()})()`,
            }}
          />
        </Head>

        <body
          className="dark:bg-darkgray-50 desktop-transparent bg-gray-100"
          style={
            this.props.isEmbed
              ? {
                  background: "transparent",
                  // Keep the embed hidden till parent initializes and
                  // - gives it the appropriate styles if UI instruction is there.
                  // - gives iframe the appropriate height(equal to document height) which can only be known after loading the page once in browser.
                  // - Tells iframe which mode it should be in (dark/light) - if there is a a UI instruction for that
                  visibility: "hidden",
                }
              : {}
          }>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
