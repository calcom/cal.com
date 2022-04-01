import { useEffect } from "react";

import { UserPlan } from "@calcom/prisma/client";

export function useExposePlanGlobally(plan: UserPlan) {
  if (typeof window !== "undefined") {
    window.CalComPlan = plan;
  }
}
