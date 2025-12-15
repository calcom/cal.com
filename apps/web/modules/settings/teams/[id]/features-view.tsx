"use client";

import { FeaturesSettings } from "@calcom/features/feature-opt-in/components/FeaturesSettings";
import { useTeamFeatureOptIn } from "@calcom/features/feature-opt-in/hooks";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";

interface TeamFeaturesViewProps {
  teamId: number;
}

const TeamFeaturesView = ({ teamId }: TeamFeaturesViewProps) => {
  const { t } = useLocale();
  const featureOptIn = useTeamFeatureOptIn(teamId);

  return (
    <SettingsHeader
      title={t("features")}
      description={t("feature_opt_in_team_description")}
      borderInShellHeader={true}>
      <FeaturesSettings featureOptIn={featureOptIn} />
    </SettingsHeader>
  );
};

export default TeamFeaturesView;
