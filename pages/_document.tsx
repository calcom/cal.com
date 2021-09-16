import Hosted from "ee/components/Hosted";
import Document, { DocumentContext, Head, Html, Main, NextScript, DocumentProps } from "next/document";
import React from "react";
import Script from "next/script";

type Props = Record<string, unknown> & DocumentProps;

class MyDocument extends Document<Props> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html>
        <Head>
          <Hosted>
            <Script>
              {`
                console.log('only show this on hosted');
              `}
            </Script>
          </Hosted>

          <Hosted pro>
            <Script>
              {`
                console.log('only show this on hosted AND if user is pro');
              `}
            </Script>
          </Hosted>

          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
          <link rel="manifest" href="/site.webmanifest" />
          <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#000000" />
          <meta name="msapplication-TileColor" content="#ff0000" />
          <meta name="theme-color" content="#ffffff" />
        </Head>
        <body className="dark:bg-black bg-gray-100">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
