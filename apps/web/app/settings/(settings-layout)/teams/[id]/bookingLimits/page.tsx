import { _generateMetadata, getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/features/auth/lib/get-server-session-for-app-dir";
import TeamBookingLimitsView from "@calcom/features/ee/teams/pages/team-booking-limits-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("booking_limits"),
    (t) => t("booking_limits_team_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();
  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader
      title={t("booking_limits")}
      description={t("booking_limits_team_description")}
      borderInShellHeader={false}>
      <TeamBookingLimitsView />
    </SettingsHeader>
  );
};

export default Page;
