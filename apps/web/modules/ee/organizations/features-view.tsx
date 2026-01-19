"use client";

import type { ReactElement } from "react";

import { FeaturesSettings } from "@calcom/features/feature-opt-in/components/FeaturesSettings";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { useOrganizationFeatureOptIn } from "~/feature-opt-in/hooks";

interface OrganizationFeaturesViewProps {
  canEdit: boolean;
}

const OrganizationFeaturesView = ({ canEdit }: OrganizationFeaturesViewProps): ReactElement => {
  const { t } = useLocale();
  const featureOptIn = useOrganizationFeatureOptIn();

  return (
    <SettingsHeader
      title={t("features")}
      description={t("feature_opt_in_org_description")}
      borderInShellHeader={true}>
      <FeaturesSettings featureOptIn={featureOptIn} canEdit={canEdit} />
    </SettingsHeader>
  );
};

export default OrganizationFeaturesView;
