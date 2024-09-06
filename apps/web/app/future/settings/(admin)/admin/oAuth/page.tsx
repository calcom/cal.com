import { _generateMetadata } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import LegacyPage from "~/settings/admin/oauth-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "OAuth",
    () => "Add new OAuth Clients"
  );

const Page = () => {
  return (
    <SettingsHeader title="OAuth" description="Add new OAuth Clients">
      <LegacyPage />
    </SettingsHeader>
  );
};

export default Page;
