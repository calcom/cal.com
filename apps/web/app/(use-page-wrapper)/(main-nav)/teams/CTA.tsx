"use client";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";

type TeamsCTAProps = {
  user: RouterOutputs["viewer"]["me"]["get"];
};

export const TeamsCTA = ({ user }: TeamsCTAProps) => {
  const { t } = useLocale();
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
