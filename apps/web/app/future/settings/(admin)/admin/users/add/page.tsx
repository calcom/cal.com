import { _generateMetadata } from "app/_utils";

import UsersAddView from "@calcom/features/ee/users/pages/users-add-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Add new user",
    () => "Here you can add a new user."
  );

const Page = () => {
  return (
    <SettingsHeader title="Add new user" description="Here you can add a new user">
      <UsersAddView />
    </SettingsHeader>
  );
};

export default Page;
