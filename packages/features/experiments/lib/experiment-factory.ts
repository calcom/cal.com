import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { PrismaClient } from "@calcom/prisma";

import type { AssignmentType, ExperimentExposureProperties, ExperimentConversionProperties } from "../types";
import { ClientPostHogExperimentTracker } from "./client/posthog-tracker";
import { ServerPostHogExperimentTracker } from "./server/posthog-tracker";

function isPostHogEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

export function createClientExperimentTracker() {
  if (isPostHogEnabled()) {
    return ClientPostHogExperimentTracker;
  }

  return {
    trackExposure: () => {},
    trackConversion: () => {},
  };
}

export function createServerExperimentTracker() {
  if (isPostHogEnabled()) {
    return ServerPostHogExperimentTracker;
  }

  return {
    trackExposure: async () => {},
    trackConversion: async () => {},
    shutdown: async () => {},
  };
}

export function createExperimentVariantGetter(prisma: PrismaClient) {
  const featuresRepository = new FeaturesRepository(prisma);

  return {
    async getVariant(
      experimentSlug: string,
      options: {
        userId?: number;
        teamId?: number;
        visitorId?: string;
      } = {}
    ): Promise<{ variant: string; assignmentType: AssignmentType } | null> {
      if (isPostHogEnabled()) {
        const { getExperimentVariant, getExperimentVariantForTeam, getExperimentVariantForVisitor } =
          await import("../utils/index");

        if (options.userId) {
          const result = await getExperimentVariant(prisma, options.userId, experimentSlug);
          return result ? { variant: result.variant, assignmentType: result.assignmentType } : null;
        }
        if (options.teamId) {
          const result = await getExperimentVariantForTeam(prisma, options.teamId, experimentSlug);
          return result ? { variant: result.variant, assignmentType: result.assignmentType } : null;
        }
        if (options.visitorId) {
          const result = await getExperimentVariantForVisitor(prisma, options.visitorId, experimentSlug);
          return result ? { variant: result.variant, assignmentType: result.assignmentType } : null;
        }
        return null;
      }

      const isEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally(
        experimentSlug as keyof import("@calcom/features/flags/config").AppFlags
      );

      return {
        variant: isEnabled ? "treatment" : "control",
        assignmentType: "deterministic",
      };
    },

    async trackExposure(
      experimentSlug: string,
      variant: string,
      assignmentType: AssignmentType,
      properties: ExperimentExposureProperties & {
        user_id?: number;
        team_id?: number;
        visitor_id?: string;
      } = {}
    ): Promise<void> {
      if (typeof window !== "undefined") {
        const tracker = createClientExperimentTracker();
        tracker.trackExposure(experimentSlug, variant, assignmentType, properties);
      } else {
        const tracker = createServerExperimentTracker();
        await tracker.trackExposure(experimentSlug, variant, assignmentType, properties);
      }
    },

    async trackConversion(
      experimentSlug: string,
      variant: string,
      assignmentType: AssignmentType,
      properties: ExperimentConversionProperties & {
        user_id?: number;
        team_id?: number;
        visitor_id?: string;
      }
    ): Promise<void> {
      if (typeof window !== "undefined") {
        const tracker = createClientExperimentTracker();
        tracker.trackConversion(experimentSlug, variant, assignmentType, properties);
      } else {
        const tracker = createServerExperimentTracker();
        await tracker.trackConversion(experimentSlug, variant, assignmentType, properties);
      }
    },
  };
}
