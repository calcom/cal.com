"use client";

import { TeamsListing } from "@calcom/features/ee/teams/components";
import Shell from "@calcom/features/shell/Shell";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button } from "@calcom/ui";

import type { getServerSideProps } from "@lib/teams/getServerSideProps";

export type PageProps = inferSSRProps<typeof getServerSideProps>;
function Teams(props: PageProps) {
  const { t } = useLocale();
  const [user] = trpc.viewer.me.useSuspenseQuery();

  return (
    <Shell
      withoutMain={false}
      heading={t("teams")}
      subtitle={t("create_manage_teams_collaborative")}
      title={t("teams")}
      description={t("create_manage_teams_collaborative")}
      hideHeadingOnMobile
      CTA={
        (!user.organizationId || user.organization.isOrgAdmin) && (
          <Button
            data-testid="new-team-btn"
            variant="fab"
            StartIcon="plus"
            type="button"
            href={`${WEBAPP_URL}/settings/teams/new?returnTo=${WEBAPP_URL}/teams`}>
            {t("new")}
          </Button>
        )
      }>
      <TeamsListing />
    </Shell>
  );
}

Teams.requiresLicense = false;

export default Teams;
