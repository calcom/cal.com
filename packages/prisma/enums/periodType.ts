import type { PeriodType } from "@prisma/client";

export const periodType: { [K in PeriodType]: K } = {
  UNLIMITED: "UNLIMITED",
  ROLLING: "ROLLING",
  RANGE: "RANGE",
};

export default periodType;
