import { _generateMetadata } from "app/_utils";

import UsersListingView from "@calcom/features/ee/users/pages/users-listing-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { Button } from "@calcom/ui";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Users",
    () => "A list of all the users in your account including their name, title, email and role."
  );

const Page = () => {
  return (
    <SettingsHeader
      title="Users"
      description="A list of all the users in your account including their name, title, email and role."
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
