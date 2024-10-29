import { _generateMetadata, getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/features/auth/lib/get-server-session-for-app-dir";
import UsersAddView from "@calcom/features/ee/users/pages/users-add-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("add_new_user"),
    (t) => t("admin_users_add_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();
  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader title={t("add_new_user")} description={t("admin_users_add_description")}>
      <UsersAddView />
    </SettingsHeader>
  );
};

export default Page;
