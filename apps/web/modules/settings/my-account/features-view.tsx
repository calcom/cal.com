"use client";

import { FeaturesSettings } from "@calcom/features/feature-opt-in/components/FeaturesSettings";
import { useUserFeatureOptIn } from "@calcom/features/feature-opt-in/hooks";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";

const FeaturesView = () => {
  const { t } = useLocale();
  const featureOptIn = useUserFeatureOptIn();

  return (
    <SettingsHeader
      title={t("features")}
      description={t("feature_opt_in_description")}
      borderInShellHeader={true}>
      <FeaturesSettings featureOptIn={featureOptIn} />
    </SettingsHeader>
  );
};

export default FeaturesView;
