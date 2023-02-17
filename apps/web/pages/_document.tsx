import type { DocumentContext, DocumentProps } from "next/document";
import Document, { Head, Html, Main, NextScript } from "next/document";
import Script from "next/script";
import { z } from "zod";

import { getDirFromLang } from "@calcom/lib/i18n";

import { csp } from "@lib/csp";

type Props = Record<string, unknown> & DocumentProps;

class MyDocument extends Document<Props> {
  static async getInitialProps(ctx: DocumentContext) {
    const { nonce } = csp(ctx.req || null, ctx.res || null);
    if (!process.env.CSP_POLICY) {
      ctx.res?.setHeader("x-csp", "not-opted-in");
    } else if (!ctx.res?.getHeader("x-csp")) {
      // If x-csp not set by gSSP, then it's initialPropsOnly
      ctx.res?.setHeader("x-csp", "initialPropsOnly");
    }
    const isEmbed = ctx.asPath?.includes("/embed") || ctx.asPath?.includes("embedType=");
    const initialProps = await Document.getInitialProps(ctx);
    return { isEmbed, nonce, ...initialProps };
  }

  render() {
    const { locale } = this.props.__NEXT_DATA__;
    const { isEmbed } = this.props;
    const nonceParsed = z.string().safeParse(this.props.nonce);
    const nonce = nonceParsed.success ? nonceParsed.data : "";
    const dir = getDirFromLang(locale);
    return (
      <Html lang={locale} dir={dir}>
        <Head nonce={nonce}>
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
          <link rel="manifest" href="/site.webmanifest" />
          <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#000000" />
          <meta name="msapplication-TileColor" content="#ff0000" />
          <meta name="theme-color" content="#ffffff" />
          <Script src="/embed-init-iframe.js" strategy="beforeInteractive" />
        </Head>

        <body
          className="dark:bg-darkgray-50 desktop-transparent bg-gray-100 antialiased"
          style={
            isEmbed
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
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
