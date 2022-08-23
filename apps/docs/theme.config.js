import { SEO_IMG_DEFAULT, DOCS_URL } from "@calcom/lib/constants";

const themeConfig = {
  github: "https://github.com/calcom/cal.com",
  docsRepositoryBase: "https://github.com/calcom/cal.com/blob/main/apps/docs/pages",
  titleSuffix: " | Cal.com",
  logo: <h4 className="m-0">Cal.com</h4>,
  head: (
    <>
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="theme-color" content="#ffffff" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Language" content="en" />
      <meta
        name="description"
        content="Explore advice and explanations for all of our features, and discover new tips and tricks to get the most out of your subscription."
      />
      <meta
        name="og:description"
        content="Explore advice and explanations for all of our features, and discover new tips and tricks to get the most out of your subscription."
      />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={SEO_IMG_DEFAULT} />
      <meta name="twitter:site:domain" content="docs.cal.com" />
      <meta name="twitter:url" content={DOCS_URL} />
      <meta name="og:title" content="Cal.com Documentation" />
      <meta name="og:image" content={SEO_IMG_DEFAULT} />
      <meta name="apple-mobile-web-app-title" content="Cal.com Docs" />

      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="manifest" href="/site.webmanifest" />
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#000000" />
      <meta name="msapplication-TileColor" content="#ff0000" />
      <meta name="theme-color" content="#ffffff" />
    </>
  ),
  search: true,
  prevLinks: true,
  nextLinks: true,
  footer: true,
  footerEditLink: "Edit this page on GitHub",
  footerText: <>© {new Date().getFullYear()} Cal.com, Inc. All rights reserved.</>,
};

export default themeConfig;
