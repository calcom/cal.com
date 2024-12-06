import { _generateMetadata, getFixedT } from "app/_utils";
import { headers } from "next/headers";

import UsersListingView from "@calcom/features/ee/users/pages/users-listing-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { Button } from "@calcom/ui";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("users"),
    (t) => t("admin_users_description")
  );

const Page = async () => {
  const headersList = await headers();
  const locale = headersList.get("x-locale");
  const t = await getFixedT(locale ?? "en");
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
      <UsersListingView />
    </SettingsHeader>
  );
};

export default Page;
