"use client";

import type { ReactElement } from "react";

import { FeaturesSettings } from "@calcom/features/feature-opt-in/components/FeaturesSettings";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { useUserFeatureOptIn } from "~/feature-opt-in/hooks";

const FeaturesView = (): ReactElement => {
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
