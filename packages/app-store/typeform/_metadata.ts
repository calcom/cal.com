import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  category: "other",
  "/*": "Don't modify slug - If required, do it using cli edit command",
  name: "Typeform",
  slug: "typeform",
  type: "typeform_other",
  logo: "/api/app-store/typeform/icon.svg",
  url: "https://cal.com/apps/typeform",
  variant: "other",
  categories: ["other"],
  publisher: APP_NAME,
  email: SUPPORT_MAIL_ADDRESS,
  description: "Adds a link to copy Typeform Redirect URL",
  __createdUsingCli: true,
} as AppMeta;

export default metadata;
