import { getFixedT } from "app/_utils";
import { getServerSession } from "next-auth";

import { AUTH_OPTIONS } from "@calcom/feature-auth/lib/next-auth-options";
import SettingsLayout from "@calcom/features/settings/layouts/SettingsLayoutAppDir";
import { APP_NAME } from "@calcom/lib/constants";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(AUTH_OPTIONS);

  const t = await getFixedT(session.user.locale || "en");

  return (
    <SettingsLayout
      title={t("profile")}
      description={t("profile_description", { appName: APP_NAME })}
      borderInShellHeader={true}>
      {children}
    </SettingsLayout>
  );
}
