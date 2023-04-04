User-agent: *
Disallow: /sandbox
Disallow: /api
Disallow: /static/locales

# Specifically allow access to OG Image api, otherwise eg Twitter won't render these images.
Allow: /api/social/og/image
# Specifically allow access to api/app-store to allow search engines to fetch assets
Allow: /api/app-store/
