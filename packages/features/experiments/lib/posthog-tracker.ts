import type { ExperimentAssignmentType } from "../types";

interface ExperimentEventProperties {
  experiment_slug: string;
  variant: string;
  assignment_type: ExperimentAssignmentType;
  user_id?: number;
  team_id?: number;
  [key: string]: unknown;
}

export function trackExperimentExposure(properties: ExperimentEventProperties): void {
  if (typeof window === "undefined") return;

  if (typeof window.posthog !== "undefined") {
    window.posthog.capture("experiment_viewed", properties);
  }
}

export function trackExperimentConversion(
  experimentSlug: string,
  variant: string,
  assignmentType: ExperimentAssignmentType,
  conversionProperties?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  if (typeof window.posthog !== "undefined") {
    window.posthog.capture("experiment_conversion", {
      experiment_slug: experimentSlug,
      variant,
      assignment_type: assignmentType,
      ...conversionProperties,
    });
  }
}

declare global {
  interface Window {
    posthog?: {
      capture: (eventName: string, properties: Record<string, unknown>) => void;
      identify: (userId: string, properties?: Record<string, unknown>) => void;
    };
  }
}
