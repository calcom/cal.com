"use client";

import { TeamsListing } from "@calcom/features/ee/teams/components";
import Shell from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import PageWrapper from "@components/PageWrapper";

export { getServerSideProps } from "@lib/teams/getServerSideProps";

function Teams() {
  const { t } = useLocale();

  return (
    <Shell
      withoutMain={false}
      heading={t("teams")}
      title="Teams"
      description="Create and manage teams to use collaborative features."
      hideHeadingOnMobile
      subtitle={t("create_manage_teams_collaborative")}
      // CTA={
      //   (!user.organizationId || user.organization.isOrgAdmin) && (
      //     <Button
      //       data-testid="new-team-btn"
      //       variant="fab"
      //       StartIcon={"plus"}
      //       type="button"
      //       href={`${WEBAPP_URL}/settings/teams/new?returnTo=${WEBAPP_URL}/teams`}>
      //       {t("new")}
      //     </Button>
      //   )
      // }>
    >
      <TeamsListing />
    </Shell>
  );
}

Teams.requiresLicense = false;
Teams.PageWrapper = PageWrapper;
export default Teams;
