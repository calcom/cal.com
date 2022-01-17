export default {
  github: 'https://github.com/calendso/calendso',
  docsRepositoryBase: 'https://github.com/calendso/docs/blob/master',
  titleSuffix: ' | Cal.com',
  logo: <img className="hidden md:inline" src="https://cal.com/logo.svg" />,
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
      <meta name="twitter:image" content="https://cal.com/og-image.png" />
      <meta name="twitter:site:domain" content="docs.cal.com" />
      <meta name="twitter:url" content="https://docs.cal.com" />
      <meta name="og:title" content="Cal.com Documentation" />
      <meta name="og:image" content="https://cal.com/og-image.png" />
      <meta name="apple-mobile-web-app-title" content="Cal.com Docs" />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-icon-180x180.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="192x192"
        href="/android-icon-192x192.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="96x96"
        href="/favicon-96x96.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon-16x16.png"
      />
      <meta name="msapplication-TileImage" content="/ms-icon-144x144.png" />
    </>
  ),
  search: true,
  prevLinks: true,
  nextLinks: true,
  footer: true,
  footerEditLink: 'Edit this page on GitHub',
  footerText: (
    <>© {new Date().getFullYear()} Cal.com, Inc. All rights reserved.</>
  ),
  unstable_faviconGlyph: '👋',
}
