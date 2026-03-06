import type { ExperimentStatusType } from "../types";

export interface ExperimentWithVariants {
  slug: string;
  status: ExperimentStatusType;
  winner: string | null;
  variants: { variantSlug: string; weight: number }[];
}

export interface IExperimentRepository {
  findBySlug(slug: string): Promise<ExperimentWithVariants | null>;
  findAllRunning(): Promise<ExperimentWithVariants[]>;
  findAll(): Promise<ExperimentWithVariants[]>;
  updateStatus(slug: string, status: ExperimentStatusType, now?: Date): Promise<void>;
  updateVariantWeight(experimentSlug: string, variantSlug: string, weight: number): Promise<void>;
  setWinner(slug: string, variantSlug: string | null): Promise<void>;
}
