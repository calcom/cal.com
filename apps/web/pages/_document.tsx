/* eslint-disable react/no-danger */
import type { IncomingMessage } from "http";
import { dir } from "i18next";
import type { NextPageContext } from "next";
import type { DocumentContext, DocumentProps } from "next/document";
import Document, { Head, Html, Main, NextScript } from "next/document";
import Script from "next/script";
import { z } from "zod";

import { IS_PRODUCTION } from "@calcom/lib/constants";

import { csp } from "@lib/csp";

import { applyTheme } from "./_applyThemeForDocument";

type Props = Record<string, unknown> & DocumentProps & { newLocale: string; currentPath: string };

function setHeader(ctx: NextPageContext, name: string, value: string) {
  try {
    ctx.res?.setHeader(name, value);
  } catch (e) {
    // Getting "Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client" when revalidate calendar cache
    console.log(`Error setting header ${name}=${value} for ${ctx.asPath || "unknown asPath"}`, e);
  }
}

class MyDocument extends Document<Props> {
  static async getInitialProps(ctx: DocumentContext) {
    const { nonce } = csp(ctx.req || null, ctx.res || null);
    if (!process.env.CSP_POLICY) {
      setHeader(ctx, "x-csp", "not-opted-in");
    } else if (!ctx.res?.getHeader("x-csp")) {
      // If x-csp not set by gSSP, then it's initialPropsOnly
      setHeader(ctx, "x-csp", "initialPropsOnly");
    }

    const getLocaleModule = ctx.req ? await import("@calcom/features/auth/lib/getLocale") : null;

    const newLocale =
      ctx.req && getLocaleModule
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await getLocaleModule.getLocale(ctx.req as IncomingMessage & { cookies: Record<string, any> })
        : "en";

    const asPath = ctx.asPath || "";
    // Use a dummy URL as default so that URL parsing works for relative URLs as well. We care about searchParams and pathname only
    const parsedUrl = new URL(asPath, "https://dummyurl");
    const isEmbedSnippetGeneratorPath = parsedUrl.pathname.startsWith("/event-types");
    // FIXME: Revisit this logic to remove embedType query param check completely. Ideally, /embed should always be there at the end of the URL. Test properly and then remove it.
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
    const currentPath = this.props?.__NEXT_DATA__?.props?.pageProps?.currentPath ?? "";

    //allowed analytics paths
    const allowedAnalyticsPaths = [
      "/apps",
      "/auth",
      "/availability",
      // "/booking",
      "/bookings",
      "/event-types",
      "/getting-started",
      // "/reschedule",
      "/settings",
      // "/team",
      "/teams",
      "/workflows",
      "/insights",
      "/signup",
      "/auth/sso/google",
      "/auth/verify-email",
      "/getting-started",
    ];

    // Meta Pixel allowed paths
    const allowedMetaPixelPaths = [
      "/signup",
      "/auth/sso/google",
      "/auth/verify-email",
      "/getting-started",
      "/event-types",
    ];

    const allowScript =
      currentPath !== "" &&
      (currentPath === "/" || allowedAnalyticsPaths.some((path) => currentPath.startsWith(path)));

    const allowMetaPixel =
      currentPath !== "" && allowedMetaPixelPaths.some((path) => currentPath.startsWith(path));

    return (
      <Html
        lang={newLocale}
        dir={newDir}
        style={embedColorScheme ? { colorScheme: embedColorScheme as string } : undefined}>
        <Head nonce={nonce}>
          <script
            nonce={nonce}
            id="newLocale"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: `
              window.calNewLocale = "${newLocale}";
              (${applyTheme.toString()})();
            `,
            }}
          />

          {/* Microsoft Clarity Script */}
          {/* <script
            id="microsoft-clarity-init"
            dangerouslySetInnerHTML={{
              __html: `
                (function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_MICROSOFT_CLARITY}");
                `,
            }}
          /> */}

          {/* Meta Pixel Code */}
          {allowMetaPixel && (
            <script
              id="meta-pixel"
              nonce={nonce}
              dangerouslySetInnerHTML={{
                __html: `
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '1095461542653320');
                  fbq('track', 'PageView');
                `,
              }}
            />
          )}

          <link rel="apple-touch-icon" sizes="180x180" href="/api/logo?type=apple-touch-icon" />
          <link rel="icon" type="image/png" sizes="32x32" href="/api/logo?type=favicon-32" />
          <link rel="icon" type="image/png" sizes="16x16" href="/api/logo?type=favicon-16" />
          <link rel="manifest" href="/site.webmanifest" />
          <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#000000" />
          <meta name="msapplication-TileColor" content="#ff0000" />
          <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F9FAFC" />
          <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1F1F1F" />
          {!IS_PRODUCTION && process.env.VERCEL_ENV === "preview" && (
            // eslint-disable-next-line @next/next/no-sync-scripts
            <script
              data-project-id="KjpMrKTnXquJVKfeqmjdTffVPf1a6Unw2LZ58iE4"
              src="https://snippet.meticulous.ai/v1/stagingMeticulousSnippet.js"
            />
          )}

          {/* {allowScript && (
            <Script
              src="https://cdn.amplitude.com/script/ca8f70a47b97a98998c9b476e4977212.js"
              strategy="beforeInteractive"
            />
          )} */}

          {allowScript && (
            <Script
              id="gtm"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
        (function(w,d,s,l,i){
          w[l]=w[l]||[];
          w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
          var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),
          dl=l!='dataLayer'?'&l='+l:'';
          j.async=true;
          j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
          f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','GTM-MJWK3XXZ');
      `,
              }}
            />
          )}

          {/* Brand details json for SEO  */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "OneHash",
                alternateName: "Cal ID",
                legalName: "OneHash Technologies Limited",
                url: "https://www.onehash.ai",
                logo: "https://cdn.prod.website-files.com/5e53d34464688e6f5960a338/610a36c2792530d601aaf35f_OneHash_Logo.svg",
                description:
                  "A Robust, Scalable, Economical, AI Powered & Fully- Featured platform with CRM, ERP, Meeting Scheduling and Chat Solution.",
                sameAs: [
                  "https://www.linkedin.com/company/onehash/",
                  "https://www.instagram.com/onehash.ai/",
                  "https://x.com/onehash",
                  "https://www.facebook.com/OneHashAI/",
                ],
                founder: {
                  "@type": "Person",
                  name: "Rohit Gadia",
                  sameAs: "https://www.linkedin.com/in/rohitgadia",
                },
                foundingDate: "2021",
                address: {
                  "@type": "PostalAddress",
                  streetAddress: "903 NRK Business Park, Vijay Nagar Square",
                  addressLocality: "Indore",
                  addressRegion: "Madhya Pradesh",
                  postalCode: "452010",
                  addressCountry: "IN",
                },
                contactPoint: {
                  "@type": "ContactPoint",
                  telephone: "+91 8827 000 000",
                  contactType: "Customer Support",
                  email: "support@cal.id",
                  areaServed: "Worldwide",
                  availableLanguage: [
                    "en",
                    "hi",
                    "es",
                    "zh",
                    "ar",
                    "fr",
                    "ru",
                    "pt",
                    "de",
                    "ja",
                    "ko",
                    "it",
                    "nl",
                    "tr",
                    "sv",
                    "pl",
                    "uk",
                    "vi",
                    "th",
                    "id",
                  ],
                },
              }),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "OneHash",
                url: "https://www.onehash.ai",
                alternateName: "Cal ID",
                potentialAction: {
                  "@type": "SearchAction",
                  target: "https://www.onehash.ai/search?q={search_term_string}",
                  "query-input": "required name=search_term_string",
                },
              }),
            }}
          />

          {/* Customer IO */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
              !function(){
                var i="cioanalytics", analytics=(window[i]=window[i]||[]);
                if(!analytics.initialize) {
                  if(analytics.invoked) {
                    window.console && console.error && console.error("Snippet included twice.");
                  } else {
                    analytics.invoked = !0;
                    analytics.methods = [
                      "trackSubmit","trackClick","trackLink","trackForm","pageview","identify",
                      "reset","group","track","ready","alias","debug","page","once","off","on",
                      "addSourceMiddleware","addIntegrationMiddleware","setAnonymousId","addDestinationMiddleware"
                    ];
                    analytics.factory = function(e) {
                      return function() {
                        var t = Array.prototype.slice.call(arguments);
                        t.unshift(e);
                        analytics.push(t);
                        return analytics;
                      };
                    };
                    for (var e = 0; e < analytics.methods.length; e++) {
                      var key = analytics.methods[e];
                      analytics[key] = analytics.factory(key);
                    }
                    analytics.load = function(key, e) {
                      var t = document.createElement("script");
                      t.type = "text/javascript";
                      t.async = !0;
                      t.setAttribute("data-global-customerio-analytics-key", i);
                      t.src = "https://cdp.customer.io/v1/analytics-js/snippet/" + key + "/analytics.min.js";
                      var n = document.getElementsByTagName("script")[0];
                      n.parentNode.insertBefore(t, n);
                      analytics._writeKey = key;
                      analytics._loadOptions = e;
                    };
                    analytics.SNIPPET_VERSION = "4.15.3";
                    analytics.load("fa6d11bb6fbfbf91cf0d");
                    analytics.page();
                  }
                }
              }();
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
          {allowScript && (
            <noscript>
              <iframe
                src="https://www.googletagmanager.com/ns.html?id=GTM-MJWK3XXZ"
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
              />
            </noscript>
          )}

          {/* Meta Pixel noscript fallback */}
          {allowMetaPixel && (
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src="https://www.facebook.com/tr?id=1095461542653320&ev=PageView&noscript=1"
                alt=""
              />
            </noscript>
          )}

          <Main />
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
