import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Coinley",
  description: "Accept cryptocurrency payments directly to your wallet. Support for USDT, USDC, and more across multiple blockchains.",
  // App is always available - users provide their own API credentials during installation
  installed: true,
  slug: "coinley",
  category: "payment",
  categories: ["payment"],
  logo: "icon.png",
  publisher: "Coinley Labs",
  title: "Coinley Crypto Payments",
  type: "coinley_payment",
  variant: "payment",
  extendsFeature: "EventType",
  url: "https://coinley.io",
  verified: true,
  rating: 5,
  reviews: 0,
  trending: true,
  isOAuth: false, // Using API key authentication
  dirName: "coinley",
  dependencies: [],
} as AppMeta;

export default metadata;
