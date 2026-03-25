"use client";

import { FeaturesSettings } from "~/feature-opt-in/components/FeaturesSettings";
import type { ReactElement } from "react";

import { useOrganizationFeatureOptIn } from "~/feature-opt-in/hooks/useOrganizationFeatureOptIn";

interface OrganizationFeaturesViewProps {
  canEdit: boolean;
}

const OrganizationFeaturesView = ({ canEdit }: OrganizationFeaturesViewProps): ReactElement => {
  const featureOptIn = useOrganizationFeatureOptIn();

  return <FeaturesSettings featureOptIn={featureOptIn} canEdit={canEdit} />;
};

export default OrganizationFeaturesView;
