import { useEffect, useRef } from "react";

import { PUBLIC_QUICK_AVAILABILITY_ROLLOUT } from "@calcom/lib/constants";

import { isVisitorWithinPercentage } from "../../utils/isFeatureEnabledForVisitor";

export const useIsQuickAvailabilityCheckFeatureEnabled = ({
  isInstantMeeting,
}: {
  isInstantMeeting: boolean;
}) => {
  const isQuickAvailabilityCheckFeatureEnabledRef = useRef(
    isVisitorWithinPercentage({ percentage: PUBLIC_QUICK_AVAILABILITY_ROLLOUT })
  );

  const isEnabled = !isInstantMeeting && isQuickAvailabilityCheckFeatureEnabledRef.current;

  useEffect(() => {
    console.log("QuickAvailabilityCheck feature enabled:", isEnabled);
  }, []);

  return isEnabled;
};
