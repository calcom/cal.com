import type { IFlags } from "flagsmith/types";

export const defaultFlags: IFlags = {
  new_feature: {
    enabled: true,
    value: null,
  },
  new_feature_2: {
    enabled: false,
    value: null,
  },
};
