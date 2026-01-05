import type { ExperimentAssignmentType } from "@calcom/prisma/enums";

export type { ExperimentAssignmentType };

export interface ExperimentVariantConfig {
  name: string;
  percentage: number;
}

export interface ExperimentMetadata {
  variants: ExperimentVariantConfig[];
  assignmentType: ExperimentAssignmentType;
  status?: "draft" | "running" | "paused" | "concluded";
  startedAt?: string;
  endedAt?: string;
  winnerVariant?: string;
  targetingRules?: TargetingRules;
}

export interface TargetingRules {
  plans?: string[]; // "individual", "teams", "organization"
  teamIds?: number[];
  organizationIds?: number[];
  excludeOrganizations?: boolean;
  userAttributes?: Record<string, unknown>;
}

export interface VariantAssignment {
  variant: string;
  experimentSlug: string;
  assignmentType: ExperimentAssignmentType;
  isNewAssignment: boolean;
}

export interface GetVariantOptions {
  userId?: number;
  teamId?: number;
}
