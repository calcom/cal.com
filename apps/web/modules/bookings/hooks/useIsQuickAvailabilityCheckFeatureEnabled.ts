import { useEffect, useRef } from "react";

import { isVisitorWithinPercentage } from "@calcom/features/bookings/Booker/utils/isFeatureEnabledForVisitor";
import { PUBLIC_QUICK_AVAILABILITY_ROLLOUT } from "@calcom/lib/constants";

export const useIsQuickAvailabilityCheckFeatureEnabled = () => {
  const isQuickAvailabilityCheckFeatureEnabledRef = useRef(
    isVisitorWithinPercentage({ percentage: PUBLIC_QUICK_AVAILABILITY_ROLLOUT })
  );

  useEffect(() => {
    console.log("QuickAvailabilityCheck feature enabled:", isQuickAvailabilityCheckFeatureEnabledRef.current);
  }, []);

  return isQuickAvailabilityCheckFeatureEnabledRef.current;
};
