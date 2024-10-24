import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Adyen",
  slug: "adyen",
  category: "payment",
  categories: ["payment"],
  logo: "icon.svg",
  publisher: "Vincent Lam",
  email: "vincentthanhlam@gmail.com",
  description:
    "Adyen is a payment gateway that supports multiple methods like credit cards, digital wallets, and bank transfers, making it ideal for international transactions. Its security features, including fraud detection and compliance with PSD2, ensure safe handling of payments in a scheduling app, streamlining transactions and enhancing user experience..",
  title: "Adyen",
  type: "adyen_payment",
  url: "https://cal.com/",
  docsUrl: "https://docs.adyen.com/",
  variant: "payment",
  extendsFeature: "EventType",
  dirName: "adyen",
} as AppMeta;

export default metadata;
