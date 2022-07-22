import Document, { DocumentContext, Head, Html, Main, NextScript, DocumentProps } from "next/document";

type Props = Record<string, unknown> & DocumentProps;

class MyDocument extends Document<Props> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    const { locale } = this.props.__NEXT_DATA__;
    const dir = locale === "ar" || locale === "he" ? "rtl" : "ltr";

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
          {/* Define isEmbed here so that it can be shared with App(embed-iframe) as well as the following code to change background and hide body */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
              window.isEmbed = ()=> {
                return location.search.includes("embed=")
              }`,
            }}
          />
        </Head>

        {/* Keep the embed hidden till parent initializes and gives it the appropriate styles */}
        <body className="bg-gray-100 dark:bg-neutral-900">
          <Main />
          <NextScript />
          {/* In case of Embed we want background to be transparent so that it merges into the website seamlessly. Also, we keep the body hidden here and embed logic would take care of showing the body when it's ready */}
          {/* We are doing it on browser and not on server because there are some pages which are not SSRd */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if (isEmbed()) {
                  document.body.style.display="none";
                  document.body.style.background="transparent";
                }`,
            }}
          />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
