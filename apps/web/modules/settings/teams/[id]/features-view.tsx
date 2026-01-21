"use client";

import { FeaturesSettings } from "@calcom/features/feature-opt-in/components/FeaturesSettings";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { ReactElement } from "react";

import { useTeamFeatureOptIn } from "~/feature-opt-in/hooks/useTeamFeatureOptIn";

interface TeamFeaturesViewProps {
  teamId: number;
  canEdit: boolean;
}

const TeamFeaturesView = ({ teamId, canEdit }: TeamFeaturesViewProps): ReactElement => {
  const { t } = useLocale();
  const featureOptIn = useTeamFeatureOptIn(teamId);

  return (
    <SettingsHeader
      title={t("features")}
      description={t("feature_opt_in_team_description")}
      borderInShellHeader={true}>
      <FeaturesSettings featureOptIn={featureOptIn} canEdit={canEdit} />
    </SettingsHeader>
  );
};

export default TeamFeaturesView;
