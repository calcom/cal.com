"use client";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";

export const TeamsCTA = () => {
  const { t } = useLocale();
  return (
    <Button
      data-testid="new-team-btn"
      variant="fab"
      StartIcon="plus"
      type="button"
      href={`${WEBAPP_URL}/settings/teams/new?returnTo=${WEBAPP_URL}/teams`}>
      {t("new")}
    </Button>
  );
};
