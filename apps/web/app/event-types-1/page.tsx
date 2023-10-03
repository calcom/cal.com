import EventTypes from "@pages/event-types";
import type { Metadata } from "next";

import { IS_CALCOM, WEBAPP_URL } from "@calcom/lib/constants";

export const metadata: Metadata = {
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0",
  metadataBase: new URL(IS_CALCOM ? "https://cal.com" : WEBAPP_URL),
  alternates: {
    canonical: "/event-types",
  },
  twitter: {
    card: "summary_large_image",
    title: "@calcom",
  },
};

export default EventTypes;
