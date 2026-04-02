import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata, getTranslate } from "app/_utils";
import UsersAddView from "~/ee/users/views/users-add-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("add_new_user"),
    (t) => t("admin_users_add_description"),
    undefined,
    undefined,
    "/settings/admin/users/add"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader title={t("add_new_user")} description={t("admin_users_add_description")}>
      <UsersAddView />
    </SettingsHeader>
  );
};

export default Page;
