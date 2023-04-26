import type { TimeUnit } from "@prisma/client";

export const timeUnit: { [K in TimeUnit]: K } = {
  DAY: "DAY",
  HOUR: "HOUR",
  MINUTE: "MINUTE",
};

export default timeUnit;
