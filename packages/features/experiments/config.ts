// Sentinel value stored in sessionStorage and sent to analytics when a user
// is in the control group (i.e. no variant assigned).
export const CONTROL_GROUP = "control";

// sessionStorage key prefix for admin variant preview overrides.
export const EXP_OVERRIDE_PREFIX = "exp_override:";

export const EXPERIMENTS = {
  "billing-upgrade-cta": {
    variants: ["upgrade_button"],
    target: "logged-in",
  },
} as const;

export type ExperimentTarget = "logged-in" | "anonymous";
export type ExperimentSlug = keyof typeof EXPERIMENTS;
export type VariantSlug<T extends ExperimentSlug> = (typeof EXPERIMENTS)[T]["variants"][number];
export type ExperimentVariantResult = string | null;
