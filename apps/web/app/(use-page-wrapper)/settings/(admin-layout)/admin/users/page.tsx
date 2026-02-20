import AdminUsersListPage from "@calid/features/modules/admin/user/pages/users-list";
import { Button } from "@calid/features/ui/components/button";
import { _generateMetadata, getTranslate } from "app/_utils";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import UsersListingView from "@calcom/features/ee/users/pages/users-listing-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("users"),
    (t) => t("admin_users_description"),
    undefined,
    undefined,
    "/settings/admin/users"
  );

const Page = async () => {
  const t = await getTranslate();
  const useEeAdmin = false;
  return (
    <SettingsHeader
      title={t("users")}
      description={t("admin_users_description")}
      CTA={
        <div className="mt-4 space-x-5 sm:ml-16 sm:mt-0 sm:flex-none">
          {/* TODO: Add import users functionality */}
          {/* <Button disabled>Import users</Button> */}
          <Button href="/settings/admin/users/add">Add user</Button>
        </div>
      }>
      {useEeAdmin ? (
        <LicenseRequired>
          <UsersListingView />
        </LicenseRequired>
      ) : (
        <AdminUsersListPage />
      )}
    </SettingsHeader>
  );
};

export default Page;
