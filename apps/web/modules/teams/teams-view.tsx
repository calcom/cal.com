"use client";

import { TeamsListing } from "@calcom/features/ee/teams/components";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";

export const TeamsCTA = () => {
  const { t } = useLocale();
  const [user] = trpc.viewer.me.get.useSuspenseQuery();
  return !user.organizationId || user.organization.isOrgAdmin ? (
    <Button
      data-testid="new-team-btn"
      variant="fab"
      StartIcon="plus"
      type="button"
      href={`${WEBAPP_URL}/settings/teams/new?returnTo=${WEBAPP_URL}/teams`}>
      {t("new")}
    </Button>
  ) : null;
};

function Teams() {
  return <TeamsListing />;
}

export default Teams;
