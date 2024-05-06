import * as React from "react";
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html>
      <Head>
        <meta property='og:title' content='Cal.com Docs' />
        <meta property='og:description' content='Open Source Scheduling: Send a link and meet or build an entire marketplace for humans to connect.' />
        <meta property='og:image' content='https://website-git-basement-website-20-cal.vercel.app/og-image-home-v2.jpeg' />
        <link as='font' crossOrigin='anonymous' href='https://cal.com/fonts/matter/Matter-SemiBold.woff' rel='preload' type='font/woff' />
        <link as='font' crossOrigin='anonymous' href='https://cal.com/fonts/matter/Matter-Regular.woff' rel='preload' type='font/woff' />
        <link as='font' crossOrigin='anonymous' href='https://cal.com/fonts/cal-sans/CalSans-SemiBold.woff2' rel='preload' type='font/woff' />
        <link rel='shortcut icon' href='/docs/images/Cal.com_pfasr5.svg' />
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link rel='preconnect' href='https://fonts.gstatic.com' />
        <meta name='apple-mobile-web-app-capable' content='yes' />
        </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
