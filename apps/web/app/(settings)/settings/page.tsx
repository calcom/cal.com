import { redirect } from "next/navigation";

export function SettingsRootRedirect() {
  redirect("/settings/my-account/general");
}
