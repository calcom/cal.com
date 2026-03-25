"use client";

import { FeaturesSettings } from "~/feature-opt-in/components/FeaturesSettings";
import type { ReactElement } from "react";

import { useTeamFeatureOptIn } from "~/feature-opt-in/hooks/useTeamFeatureOptIn";

interface TeamFeaturesViewProps {
  teamId: number;
  canEdit: boolean;
}

const TeamFeaturesView = ({ teamId, canEdit }: TeamFeaturesViewProps): ReactElement => {
  const featureOptIn = useTeamFeatureOptIn(teamId);

  return <FeaturesSettings featureOptIn={featureOptIn} canEdit={canEdit} />;
};

export default TeamFeaturesView;
