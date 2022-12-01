import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  category: "automation",
  "/*": "Don't modify slug - If required, do it using cli edit command",
  name: "n8n",
  slug: "n8n",
  type: "n8n_automation",
  imageSrc: "/api/app-store/n8n/icon.svg",
  logo: "/api/app-store/n8n/icon.svg",
  url: "https://cal.com/apps/n8n",
  variant: "automation",
  categories: ["automation"],
  publisher: APP_NAME,
  email: SUPPORT_MAIL_ADDRESS,
  description:
    "Automate without limits. The workflow automation platform that doesn't box you in, that you never outgrow",
  __createdUsingCli: true,
} as AppMeta;

export default metadata;
