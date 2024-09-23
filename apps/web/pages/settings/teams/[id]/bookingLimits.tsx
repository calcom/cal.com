import TeamBookingLimitsView from "@calcom/features/ee/teams/pages/team-booking-limits-view";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const Page = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta
        title={t("booking_limits")}
        description={t("booking_limits_team_description")}
        borderInShellHeader={false}
      />
      <TeamBookingLimitsView />
    </>
  );
};
Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
