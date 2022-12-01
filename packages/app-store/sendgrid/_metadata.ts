import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  category: "other",
  "/*": "Don't modify slug - If required, do it using cli edit command",
  name: "Sendgrid",
  slug: "sendgrid",
  type: "sendgrid_other_calendar",
  imageSrc: "/api/app-store/sendgrid/logo.png",
  logo: "/api/app-store/sendgrid/logo.png",
  url: "https://cal.com/apps/sendgrid",
  variant: "other_calendar",
  categories: ["other"],
  publisher: APP_NAME,
  email: SUPPORT_MAIL_ADDRESS,
  description:
    "SendGrid delivers your transactional and marketing emails through the world's largest cloud-based email delivery platform.",
  extendsFeature: "User",
  __createdUsingCli: true,
} as AppMeta;

export default metadata;
