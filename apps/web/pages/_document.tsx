/* eslint-disable react/no-danger */
import type { IncomingMessage } from "http";
import { dir } from "i18next";
import type { DocumentContext, DocumentProps } from "next/document";
import Document, { Head, Html, Main, NextScript } from "next/document";
import { z } from "zod";

import { csp } from "@lib/csp";

import { applyTheme } from "./_applyThemeForDocument";

type Props = Record<string, unknown> & DocumentProps & { newLocale: string };

class MyDocument extends Document<Props> {
  static async getInitialProps(ctx: DocumentContext) {
    const { nonce } = csp(ctx.req || null, ctx.res || null);

    // Set CSP headers
    if (!process.env.CSP_POLICY) {
      try {
        ctx.res?.setHeader("x-csp", "not-opted-in");
      } catch (e) {
        console.log(`Error setting header x-csp for ${ctx.asPath || "unknown asPath"}`, e);
      }
    } else if (!ctx.res?.getHeader("x-csp")) {
      try {
        ctx.res?.setHeader("x-csp", "initialPropsOnly");
      } catch (e) {
        console.log(`Error setting header x-csp for ${ctx.asPath || "unknown asPath"}`, e);
      }
    }

    const getLocaleModule = ctx.req ? await import("@calcom/features/auth/lib/getLocale") : null;

    const newLocale =
      ctx.req && getLocaleModule
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await getLocaleModule.getLocale(ctx.req as IncomingMessage & { cookies: Record<string, any> })
        : "en";

    const asPath = ctx.asPath || "";
    const parsedUrl = new URL(asPath, "https://dummyurl");
    const isEmbedSnippetGeneratorPath = parsedUrl.pathname.startsWith("/event-types");
    const isEmbed =
      (parsedUrl.pathname.endsWith("/embed") || parsedUrl.searchParams.get("embedType") !== null) &&
      !isEmbedSnippetGeneratorPath;
    const embedColorScheme = parsedUrl.searchParams.get("ui.color-scheme");

    const initialProps = await Document.getInitialProps(ctx);
    return { isEmbed, embedColorScheme, nonce, ...initialProps, newLocale };
  }

  render() {
    const { isEmbed, embedColorScheme } = this.props;
    const newLocale = this.props.newLocale || "en";
    const newDir = dir(newLocale);

    const nonceParsed = z.string().safeParse(this.props.nonce);
    const nonce = nonceParsed.success ? nonceParsed.data : "";

    return (
      <Html
        lang={newLocale}
        dir={newDir}
        style={embedColorScheme ? { colorScheme: embedColorScheme as string } : undefined}>
        <Head nonce={nonce}>
          <script
            nonce={nonce}
            id="newLocale"
            dangerouslySetInnerHTML={{
              __html: `
              window.calNewLocale = "${newLocale}";
              (${applyTheme.toString()})();
            `,
            }}
          />
        </Head>

        <body
          className="dark:bg-default bg-primary antialiased"
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
