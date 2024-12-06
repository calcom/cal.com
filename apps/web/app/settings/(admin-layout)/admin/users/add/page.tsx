import { _generateMetadata, getFixedT } from "app/_utils";
import { headers } from "next/headers";

import UsersAddView from "@calcom/features/ee/users/pages/users-add-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("add_new_user"),
    (t) => t("admin_users_add_description")
  );

const Page = async () => {
  const headersList = await headers();
  const locale = headersList.get("x-locale");
  const t = await getFixedT(locale ?? "en");

  return (
    <SettingsHeader title={t("add_new_user")} description={t("admin_users_add_description")}>
      <UsersAddView />
    </SettingsHeader>
  );
};

export default Page;
