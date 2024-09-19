import { _generateMetadata } from "app/_utils";
import { notFound } from "next/navigation";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { AdminRepository } from "@calcom/lib/server/repository/admin";

import LockedSMSView from "~/settings/admin/locked-sms-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Locked SMS",
    () => "Lock or unlock SMS sending for users"
  );

const Page = async () => {
  try {
    const usersAndTeams = await AdminRepository.getSMSLockStateTeamsUsers();
    return (
      <SettingsHeader title="Locked SMS" description="Lock or unlock SMS sending for users">
        <LockedSMSView ssrProps={{ usersAndTeams }} />
      </SettingsHeader>
    );
  } catch (e) {
    notFound();
  }
};

export default Page;
