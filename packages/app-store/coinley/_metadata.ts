import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Coinley",
  description: "Accept cryptocurrency payments directly to your wallet. Support for USDT, USDC, and more across multiple blockchains.",
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
  email: "support@coinley.io",
  dirName: "coinley",
  isOAuth: false,
} as AppMeta;

export default metadata;
