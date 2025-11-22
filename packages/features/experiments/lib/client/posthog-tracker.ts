import type {
  AssignmentType,
  ExperimentExposureProperties,
  ExperimentConversionProperties,
} from "../../types";

declare global {
  interface Window {
    posthog?: {
      __loaded?: boolean;
      capture: (event: string, properties?: Record<string, unknown>) => void;
    };
  }
}

export class ClientPostHogExperimentTracker {
  static trackExposure(
    experimentSlug: string,
    variant: string,
    assignmentType: AssignmentType,
    properties: ExperimentExposureProperties = {}
  ): void {
    if (typeof window === "undefined" || !window.posthog || !window.posthog.__loaded) {
      return;
    }

    window.posthog.capture("experiment_viewed", {
      experiment_slug: experimentSlug,
      variant,
      assignment_type: assignmentType,
      ...properties,
    });
  }

  static trackConversion(
    experimentSlug: string,
    variant: string,
    assignmentType: AssignmentType,
    properties: ExperimentConversionProperties
  ): void {
    if (typeof window === "undefined" || !window.posthog || !window.posthog.__loaded) {
      return;
    }

    const { conversionEvent, ...restProperties } = properties;

    window.posthog.capture("experiment_conversion", {
      experiment_slug: experimentSlug,
      variant,
      assignment_type: assignmentType,
      conversion_event: conversionEvent,
      ...restProperties,
    });
  }
}

export const trackExperimentExposure = (
  experimentSlug: string,
  variant: string,
  assignmentType: AssignmentType,
  properties: ExperimentExposureProperties & {
    user_id?: number;
    team_id?: number;
    visitor_id?: string;
  } = {}
) => {
  ClientPostHogExperimentTracker.trackExposure(experimentSlug, variant, assignmentType, properties);
};

export const trackExperimentConversion = (
  experimentSlug: string,
  variant: string,
  assignmentType: AssignmentType,
  properties: ExperimentConversionProperties & {
    user_id?: number;
    team_id?: number;
    visitor_id?: string;
  }
) => {
  ClientPostHogExperimentTracker.trackConversion(experimentSlug, variant, assignmentType, properties);
};
