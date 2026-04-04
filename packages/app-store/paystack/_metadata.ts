import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Paystack",
  description: _package.description,
  installed: true,
  type: "paystack_payment",
  variant: "payment",
  logo: "icon.svg",
  publisher: "Cal.com",
  url: "https://paystack.com",
  categories: ["payment"],
  slug: "paystack",
  title: "Paystack",
  email: "support@cal.com",
  dirName: "paystack",
  isOAuth: true,
} as AppMeta;

export default metadata;
