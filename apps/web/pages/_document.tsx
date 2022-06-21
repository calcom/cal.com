import Document, { DocumentContext, Head, Html, Main, NextScript, DocumentProps } from "next/document";

type Props = Record<string, unknown> & DocumentProps;

class MyDocument extends Document<Props> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    const isEmbed = ctx.req?.url?.includes("embed=");
    return { ...initialProps, isEmbed };
  }

  render() {
    const props = this.props;
    const { locale, gssp } = this.props.__NEXT_DATA__;
    const dir = locale === "ar" || locale === "he" ? "rtl" : "ltr";

    // gssp -> getServerSideProps allow us to know that this page was rendered server side and thus would have ctx.req.url with embed query param(if it was there in the request)
    // In that case only, we should consider embed to be enabled. For other cases it should be handled at client side and the component should ensure that flicker due to changing css doesn't occur
    const isEmbedCorrectlyDetected = gssp && props.isEmbed;

    return (
      <Html lang={locale} dir={dir}>
        <Head>
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
          <link rel="manifest" href="/site.webmanifest" />
          <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#000000" />
          <meta name="msapplication-TileColor" content="#ff0000" />
          <meta name="theme-color" content="#ffffff" />
        </Head>

        {/* Keep the embed hidden till parent initializes and gives it the appropriate styles */}
        <body
          className={isEmbedCorrectlyDetected ? "bg-transparent" : "bg-gray-100 dark:bg-neutral-900"}
          style={isEmbedCorrectlyDetected ? { display: "none" } : {}}>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
