import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Vital",
  description: "Connect your health data or wearables to trigger actions on your calendar.",
  installed: true,
  category: "automation",
  categories: ["automation"],
  logo: "icon-dark.svg",
  label: "Vital",
  publisher: "Vital",
  slug: "vital-automation",
  title: "Vital",
  type: "vital_other",
  url: "https://tryvital.io",
  variant: "other",
  email: "support@tryvital.io",
  dirName: "vital",
  isOAuth: true,
} as AppMeta;

export default metadata;
