import { _generateMetadata, getFixedT } from "app/_utils";
import { headers } from "next/headers";

import TeamBookingLimitsView from "@calcom/features/ee/teams/pages/team-booking-limits-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("booking_limits"),
    (t) => t("booking_limits_team_description")
  );

const Page = async () => {
  const headersList = await headers();
  const locale = headersList.get("x-locale");
  const t = await getFixedT(locale ?? "en");

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
