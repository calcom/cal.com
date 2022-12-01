import { APP_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  category: "other",
  "/*": "Don't modify slug - If required, do it using cli edit command",
  name: "QR Code",
  slug: "qr_code",
  type: "qr_code_other",
  imageSrc: "/api/app-store/qr_code/icon.svg",
  logo: "/api/app-store/qr_code/icon.svg",
  url: "https://cal.com/apps/qr_code",
  variant: "other",
  categories: ["other"],
  extendsFeature: "EventType",
  publisher: APP_NAME,
  email: SUPPORT_MAIL_ADDRESS,
  description: "Easily generate a QR code for your links to print, share, or embed.",
  __createdUsingCli: true,
} as AppMeta;

export default metadata;
