import type { ExperimentStatusType } from "../types";

export interface ExperimentWithVariants {
  slug: string;
  label: string | null;
  description: string | null;
  status: ExperimentStatusType;
  winner: string | null;
  variants: { variantSlug: string; label: string | null; weight: number }[];
}

export interface UpdateStatusInput {
  slug: string;
  status: ExperimentStatusType;
  userId: number;
  now?: Date;
}

export interface UpdateVariantWeightInput {
  experimentSlug: string;
  variantSlug: string;
  weight: number;
  userId: number;
}

export interface SetWinnerInput {
  slug: string;
  variantSlug: string | null;
  userId: number;
}

export interface IExperimentRepository {
  findBySlug(slug: string): Promise<ExperimentWithVariants | null>;
  findAllRunning(): Promise<ExperimentWithVariants[]>;
  findAll(): Promise<ExperimentWithVariants[]>;
  updateStatus(input: UpdateStatusInput): Promise<void>;
  updateVariantWeight(input: UpdateVariantWeightInput): Promise<void>;
  setWinner(input: SetWinnerInput): Promise<void>;
}
