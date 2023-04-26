import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Vital",
  description: _package.description,
  installed: true,
  category: "other",
  categories: ["other"],
  logo: "icon.svg",
  label: "Vital",
  publisher: "Vital",
  slug: "vital-automation",
  title: "Vital",
  type: "vital_other",
  url: "https://tryvital.io",
  variant: "other",
  email: "support@tryvital.io",
  dirName: "vital",
} as AppMeta;

export default metadata;
