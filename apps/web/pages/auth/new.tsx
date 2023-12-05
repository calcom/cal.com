import { AppConfig } from "@calcom/web/app-config";

export default function NewUserPage() {
  if (typeof window !== "undefined") {
    window.location.assign(AppConfig.env.NEXT_PUBLIC_WEBAPP_URL || "https://app.cal.com");
  }
  return null;
}
