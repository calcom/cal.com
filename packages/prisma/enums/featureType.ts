import type { FeatureType } from "@prisma/client";

export const featureType: { [K in FeatureType]: K } = {
  RELEASE: "RELEASE",
  EXPERIMENT: "EXPERIMENT",
  OPERATIONAL: "OPERATIONAL",
  KILL_SWITCH: "KILL_SWITCH",
  PERMISSION: "PERMISSION",
};

export default featureType;
