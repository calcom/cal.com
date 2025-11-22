import type { PrismaClient } from "@calcom/prisma";

import { ExperimentsRepository } from "../experiments.repository";
import { trackExperimentExposure, trackExperimentConversion } from "../lib/client/posthog-tracker";
import type {
  AssignmentType,
  ExperimentAssignmentOptions,
  VariantAssignmentResult,
  ExperimentExposureProperties,
  ExperimentConversionProperties,
} from "../types";

export async function getExperimentVariant(
  prisma: PrismaClient,
  userId: number,
  experimentSlug: string,
  options: ExperimentAssignmentOptions = {}
): Promise<VariantAssignmentResult | null> {
  const repository = new ExperimentsRepository(prisma);
  return repository.getVariantForUser(userId, experimentSlug, options);
}

export async function getExperimentVariantForTeam(
  prisma: PrismaClient,
  teamId: number,
  experimentSlug: string,
  options: ExperimentAssignmentOptions = {}
): Promise<VariantAssignmentResult | null> {
  const repository = new ExperimentsRepository(prisma);
  return repository.getVariantForTeam(teamId, experimentSlug, options);
}

export async function getExperimentVariantForVisitor(
  prisma: PrismaClient,
  visitorId: string,
  experimentSlug: string,
  options: ExperimentAssignmentOptions = {}
): Promise<VariantAssignmentResult | null> {
  const repository = new ExperimentsRepository(prisma);
  return repository.getVariantForVisitor(visitorId, experimentSlug, options);
}

export function trackExperimentExposureEvent(
  experimentSlug: string,
  variant: string,
  assignmentType: AssignmentType,
  properties: ExperimentExposureProperties & {
    user_id?: number;
    team_id?: number;
    visitor_id?: string;
  } = {}
): void {
  trackExperimentExposure(experimentSlug, variant, assignmentType, properties);
}

export function trackExperimentConversionEvent(
  experimentSlug: string,
  variant: string,
  assignmentType: AssignmentType,
  properties: ExperimentConversionProperties & {
    user_id?: number;
    team_id?: number;
    visitor_id?: string;
  }
): void {
  trackExperimentConversion(experimentSlug, variant, assignmentType, properties);
}

export async function getVariantAndTrackExposure(
  prisma: PrismaClient,
  experimentSlug: string,
  options: {
    userId?: number;
    teamId?: number;
    visitorId?: string;
  } & ExperimentAssignmentOptions &
    ExperimentExposureProperties = {}
): Promise<VariantAssignmentResult | null> {
  const { userId, teamId, visitorId, assignIfMissing, metadata, skipCache, ...trackingProperties } = options;

  let result: VariantAssignmentResult | null = null;

  if (userId) {
    result = await getExperimentVariant(prisma, userId, experimentSlug, {
      assignIfMissing,
      metadata,
      skipCache,
    });
  } else if (teamId) {
    result = await getExperimentVariantForTeam(prisma, teamId, experimentSlug, {
      assignIfMissing,
      metadata,
      skipCache,
    });
  } else if (visitorId) {
    result = await getExperimentVariantForVisitor(prisma, visitorId, experimentSlug, {
      assignIfMissing,
      metadata,
      skipCache,
    });
  }

  if (result) {
    trackExperimentExposureEvent(experimentSlug, result.variant, result.assignmentType, {
      user_id: userId,
      team_id: teamId,
      visitor_id: visitorId,
      ...trackingProperties,
    });
  }

  return result;
}
