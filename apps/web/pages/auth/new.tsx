import { WEBAPP_URL } from "@calcom/lib/constants";

export default function NewUserPage() {
  if (typeof window !== "undefined") {
    window.location.assign(WEBAPP_URL || "https://app.cal.com");
  }
  return null;
}
