import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { Button } from "@calcom/ui/components/button";
import { _generateMetadata, getTranslate } from "app/_utils";
import UsersListingView from "~/users/views/users-listing-view";

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
  return (
    <SettingsHeader
      title={t("users")}
      description={t("admin_users_description")}
      CTA={
        <div className="mt-4 space-x-5 sm:ml-16 sm:mt-0 sm:flex-none">
          <Button href="/settings/admin/users/add">{t("add_new_user")}</Button>
        </div>
      }>
      <UsersListingView />
    </SettingsHeader>
  );
};

export default Page;
