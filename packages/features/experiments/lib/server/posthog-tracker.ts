import type {
  AssignmentType,
  PostHogExperimentEvent,
  ExperimentExposureProperties,
  ExperimentConversionProperties,
} from "../../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let posthogClient: any = null;

function getPostHogClient() {
  if (posthogClient) {
    return posthogClient;
  }

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  if (!posthogKey) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PostHog = require("posthog-node").PostHog;
    posthogClient = new PostHog(posthogKey, {
      host: posthogHost,
    });
    return posthogClient;
  } catch (error) {
    console.warn("posthog-node not available, skipping server-side tracking:", error);
    return null;
  }
}

export class ServerPostHogExperimentTracker {
  static async trackExposure(
    experimentSlug: string,
    variant: string,
    assignmentType: AssignmentType,
    properties: ExperimentExposureProperties & {
      user_id?: number;
      team_id?: number;
      visitor_id?: string;
    } = {}
  ): Promise<void> {
    const client = getPostHogClient();
    if (!client) {
      return;
    }

    try {
      const eventProperties: PostHogExperimentEvent["properties"] = {
        experiment_slug: experimentSlug,
        variant,
        assignment_type: assignmentType,
        ...properties,
      };

      const distinctId =
        properties.user_id?.toString() ||
        properties.team_id?.toString() ||
        properties.visitor_id ||
        "anonymous";

      client.capture({
        distinctId,
        event: "experiment_viewed",
        properties: eventProperties,
      });
    } catch (error) {
      console.error("Failed to track experiment exposure:", error);
    }
  }

  static async trackConversion(
    experimentSlug: string,
    variant: string,
    assignmentType: AssignmentType,
    properties: ExperimentConversionProperties & {
      user_id?: number;
      team_id?: number;
      visitor_id?: string;
    }
  ): Promise<void> {
    const client = getPostHogClient();
    if (!client) {
      return;
    }

    try {
      const { conversionEvent, ...restProperties } = properties;

      const eventProperties: PostHogExperimentEvent["properties"] = {
        experiment_slug: experimentSlug,
        variant,
        assignment_type: assignmentType,
        conversion_event: conversionEvent,
        ...restProperties,
      };

      const distinctId =
        properties.user_id?.toString() ||
        properties.team_id?.toString() ||
        properties.visitor_id ||
        "anonymous";

      client.capture({
        distinctId,
        event: "experiment_conversion",
        properties: eventProperties,
      });
    } catch (error) {
      console.error("Failed to track experiment conversion:", error);
    }
  }

  static async shutdown(): Promise<void> {
    if (posthogClient) {
      await posthogClient.shutdown();
      posthogClient = null;
    }
  }
}
