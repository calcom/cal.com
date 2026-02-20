import AdminUserAddPage from "@calid/features/modules/admin/user/pages/user-add";
import { _generateMetadata, getTranslate } from "app/_utils";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import UsersAddView from "@calcom/features/ee/users/pages/users-add-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

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
  const useEeAdmin = false;

  return (
    <SettingsHeader title={t("add_new_user")} description={t("admin_users_add_description")}>
      {useEeAdmin ? (
        <LicenseRequired>
          <UsersAddView />
        </LicenseRequired>
      ) : (
        <AdminUserAddPage />
      )}
    </SettingsHeader>
  );
};

export default Page;
