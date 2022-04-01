import { useEffect } from "react";

import { UserPlan } from "@calcom/prisma/client";

export function useExposePlanGlobally(plan: UserPlan) {
  // Don't wait for component to mount. Do it ASAP. Delaying it would delay UI Configuration.
  if (typeof window !== "undefined") {
    window.CalComPlan = plan;
  }
}
