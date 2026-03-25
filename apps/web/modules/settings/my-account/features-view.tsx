"use client";

import { FeaturesSettings } from "~/feature-opt-in/components/FeaturesSettings";
import type { ReactElement } from "react";

import { useUserFeatureOptIn } from "~/feature-opt-in/hooks/useUserFeatureOptIn";

const FeaturesView = (): ReactElement => {
  const featureOptIn = useUserFeatureOptIn();

  return <FeaturesSettings featureOptIn={featureOptIn} />;
};

export default FeaturesView;
