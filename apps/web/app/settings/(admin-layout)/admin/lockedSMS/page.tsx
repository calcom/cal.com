import { _generateMetadata } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import LockedSMSView from "~/settings/admin/locked-sms-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Locked SMS",
    () => "Lock or unlock SMS sending for users"
  );

const Page = () => {
  return (
    <SettingsHeader title="Locked SMS" description="Lock or unlock SMS sending for users">
      <LockedSMSView />
    </SettingsHeader>
  );
};

export default Page;
