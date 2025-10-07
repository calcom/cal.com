import { validJson } from "@calcom/lib/jsonUtils";
import type { AppMeta } from "@calcom/types/App";

import _package from "./package.json";

export const metadata = {
  name: "Google Meet",
  description: _package.description,
  installed: !!(process.env.GOOGLE_API_CREDENTIALS && validJson(process.env.GOOGLE_API_CREDENTIALS)),
  slug: "google-meet",
  category: "conferencing",
  categories: ["conferencing"],
  type: "google_video",
  title: "Google Meet",
  variant: "conferencing",
  logo: "logo.webp",
  publisher: "Cal ID",
  url: "https://cal.id/",
  isGlobal: false,
  email: "support@cal.id",
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:google:meet",
      label: "Google Meet",
    },
  },
  dirName: "googlevideo",
  dependencies: ["google-calendar"],
  isOAuth: false,
} as AppMeta;

export default metadata;
