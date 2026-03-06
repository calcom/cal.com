export const EXPERIMENTS = {
  "billing-upgrade-cta": {
    description: "Replace 'Manage billing' with 'Upgrade' button",
    variants: ["upgrade_button"],
    target: "logged-in",
  },
} as const;

export type ExperimentTarget = "logged-in" | "anonymous";
export type ExperimentSlug = keyof typeof EXPERIMENTS;
export type VariantSlug<T extends ExperimentSlug> = (typeof EXPERIMENTS)[T]["variants"][number];
export type ExperimentVariantResult = string | null;
