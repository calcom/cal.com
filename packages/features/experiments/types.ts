export type AssignmentType = "deterministic" | "random";

export type PrismaAssignmentType = "DETERMINISTIC" | "RANDOM";

export function toPrismaAssignmentType(type: AssignmentType): PrismaAssignmentType {
  return type.toUpperCase() as PrismaAssignmentType;
}

export function fromPrismaAssignmentType(type: PrismaAssignmentType): AssignmentType {
  return type.toLowerCase() as AssignmentType;
}

export interface ExperimentVariantConfig {
  name: string;
  percentage: number;
}

export interface ExperimentConfig {
  slug: string;
  variants: ExperimentVariantConfig[];
  assignmentType: AssignmentType;
  enabled?: boolean;
}

export interface VariantAssignmentResult {
  variant: string;
  assignmentType: AssignmentType;
  isNewAssignment: boolean;
  experimentSlug: string;
}

export interface ExperimentAssignmentOptions {
  assignIfMissing?: boolean;
  metadata?: Record<string, unknown>;
  skipCache?: boolean;
}

export interface PostHogExperimentEvent {
  event: "experiment_viewed" | "experiment_conversion";
  properties: {
    experiment_slug: string;
    variant: string;
    assignment_type: AssignmentType;
    user_id?: number;
    team_id?: number;
    visitor_id?: string;
    conversion_event?: string;
    [key: string]: unknown;
  };
}

export interface ExperimentExposureProperties {
  [key: string]: unknown;
}

export interface ExperimentConversionProperties {
  conversionEvent: string;
  [key: string]: unknown;
}
