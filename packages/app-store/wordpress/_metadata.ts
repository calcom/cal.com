import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  category: "other",
  "/*": "Don't modify slug - If required, do it using cli edit command",
  name: "Wordpress",
  slug: "wordpress",
  type: "wordpress_other",
  imageSrc: "/api/app-store/wordpress/icon.svg",
  logo: "/api/app-store/wordpress/icon.svg",
  url: "https://github.com/calcom/wp-plugin",
  variant: "other",
  categories: ["other"],
  publisher: APP_NAME,
  email: SUPPORT_MAIL_ADDRESS,
  description: "Embedded booking pages right into your wordpress page",
  extendsFeature: "EventType",
  __createdUsingCli: true,
} as AppMeta;

export default metadata;
