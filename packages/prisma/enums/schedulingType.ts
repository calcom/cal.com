import type { SchedulingType } from "@prisma/client";

export const schedulingType: { [K in SchedulingType]: K } = {
  ROUND_ROBIN: "ROUND_ROBIN",
  COLLECTIVE: "COLLECTIVE",
  MANAGED: "MANAGED",
};

export default schedulingType;
