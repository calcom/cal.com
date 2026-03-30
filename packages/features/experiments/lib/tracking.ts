import posthog from "posthog-js";

import { CONTROL_GROUP } from "../config";

export function trackExperimentExposure(experimentSlug: string, variant: string | null) {
  posthog.capture("experiment_exposure", {
    experiment: experimentSlug,
    variant: variant ?? CONTROL_GROUP,
  });
}

export function trackExperimentOutcome(experimentSlug: string, variant: string | null) {
  posthog.capture("experiment_outcome", {
    experiment: experimentSlug,
    variant: variant ?? CONTROL_GROUP,
  });
}
