import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "LawPay",
  description: _package.description,
  installed: !!(
    process.env.LAWPAY_CLIENT_ID &&
    process.env.LAWPAY_CLIENT_SECRET &&
    process.env.NEXT_PUBLIC_LAWPAY_PUBLIC_KEY
  ),
  slug: "lawpay",
  category: "payment",
  categories: ["payment"],
  logo: "icon.svg",
  publisher: "Cal.com",
  title: "LawPay",
  type: "lawpay_payment",
  url: "https://cal.com/",
  docsUrl: "https://developers.8am.com/reference/api.html",
  variant: "payment",
  extendsFeature: "EventType",
  email: "support@cal.com",
  dirName: "lawpay",
  isOAuth: true,
} as AppMeta;

export default metadata;
