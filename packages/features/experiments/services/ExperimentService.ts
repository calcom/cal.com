import { BILLING_PLANS } from "@calcom/features/ee/billing/constants";
import type { AdminExperimentViewDto } from "@calcom/lib/dto/AdminExperimentViewDto";
import type { ExperimentConfigDto } from "@calcom/lib/dto/ExperimentConfigDto";
import { ErrorWithCode } from "@calcom/lib/errors";
import { EXPERIMENTS } from "../config";
import { assignVariant, hashUserToPercent } from "../lib/bucketing";
import type { ExperimentWithVariants, IExperimentRepository } from "../repositories/IExperimentRepository";
import type { ExperimentStatusType } from "../types";
import { EXPERIMENT_STATUS } from "../types";

export interface IExperimentServiceDeps {
  experimentRepo: IExperimentRepository;
}

export interface UpdateStatusInput {
  slug: string;
  status: ExperimentStatusType;
  userId: number;
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

export interface GetVariantsForUserInput {
  userId: number;
  userPlan: string;
  configs: ExperimentConfigDto[];
}

export class ExperimentService {
  constructor(private deps: IExperimentServiceDeps) {}

  async getAllRunningConfigs(): Promise<ExperimentConfigDto[]> {
    const running = await this.deps.experimentRepo.findAllRunning();
    return running.map(this.toConfig);
  }

  async getAllConfigs(): Promise<ExperimentConfigDto[]> {
    const all = await this.deps.experimentRepo.findAll();
    return all.map(this.toConfig);
  }

  // Merges code-defined experiments with DB state for the admin UI.
  // Experiments not yet in the DB default to DRAFT with zero-weight variants.
  async getAdminListView(): Promise<AdminExperimentViewDto[]> {
    const dbExperiments = await this.deps.experimentRepo.findAll();
    const dbBySlug = new Map(dbExperiments.map((e) => [e.slug, e]));

    return Object.entries(EXPERIMENTS).map(([slug, config]) => {
      const db = dbBySlug.get(slug);
      return {
        slug,
        label: db?.label ?? null,
        description: db?.description ?? null,
        target: config.target,
        codeVariants: [...config.variants],
        status: db?.status ?? EXPERIMENT_STATUS.DRAFT,
        winner: db?.winner ?? null,
        variants: db
          ? db.variants.map((v) => ({ slug: v.variantSlug, label: v.label, weight: v.weight }))
          : config.variants.map((v) => ({ slug: v, label: null, weight: 0 })),
      };
    });
  }

  async updateStatus({ slug, status, userId }: UpdateStatusInput): Promise<void> {
    const experiment = await this.deps.experimentRepo.findBySlug(slug);
    if (!experiment) {
      throw ErrorWithCode.Factory.NotFound(`Experiment '${slug}' not found`);
    }
    await this.deps.experimentRepo.updateStatus({ slug, status, userId });
  }

  async updateVariantWeight({ experimentSlug, variantSlug, weight, userId }: UpdateVariantWeightInput): Promise<void> {
    const experiment = await this.deps.experimentRepo.findBySlug(experimentSlug);
    if (!experiment) {
      throw ErrorWithCode.Factory.NotFound(`Experiment '${experimentSlug}' not found`);
    }
    if (weight < 0 || weight > 100) {
      throw ErrorWithCode.Factory.BadRequest(`Weight must be between 0 and 100, got ${weight}`);
    }
    const otherWeightsSum = experiment.variants
      .filter((v) => v.variantSlug !== variantSlug)
      .reduce((sum, v) => sum + v.weight, 0);
    if (otherWeightsSum + weight > 100) {
      throw ErrorWithCode.Factory.BadRequest(
        `Total variant weights cannot exceed 100% (other variants: ${otherWeightsSum}%, requested: ${weight}%)`
      );
    }
    await this.deps.experimentRepo.updateVariantWeight({ experimentSlug, variantSlug, weight, userId });
  }

  async setWinner({ slug, variantSlug, userId }: SetWinnerInput): Promise<void> {
    const experiment = await this.deps.experimentRepo.findBySlug(slug);
    if (!experiment) {
      throw ErrorWithCode.Factory.NotFound(`Experiment '${slug}' not found`);
    }
    await this.deps.experimentRepo.setWinner({ slug, variantSlug, userId });
  }

  async getVariantsForUser({ userId, userPlan, configs }: GetVariantsForUserInput): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};
    for (const config of configs) {
      if (userPlan === BILLING_PLANS.ENTERPRISE) {
        result[config.slug] = null;
        continue;
      }
      if (config.status === EXPERIMENT_STATUS.ROLLED_OUT) {
        result[config.slug] = config.winner;
      } else {
        const userPercent = hashUserToPercent(userId, config.slug);
        result[config.slug] = assignVariant(userPercent, config.variants);
      }
    }
    return result;
  }

  async getVariant(userId: number, experimentSlug: string): Promise<string | null> {
    if (!(experimentSlug in EXPERIMENTS)) return null;

    const experiment = await this.deps.experimentRepo.findBySlug(experimentSlug);
    if (!experiment) return null;
    if (experiment.status === EXPERIMENT_STATUS.ROLLED_OUT) return experiment.winner;
    if (experiment.status !== EXPERIMENT_STATUS.RUNNING) return null;

    const userPercent = hashUserToPercent(userId, experimentSlug);
    return assignVariant(
      userPercent,
      experiment.variants.map((v) => ({ slug: v.variantSlug, weight: v.weight }))
    );
  }

  private toConfig(exp: ExperimentWithVariants): ExperimentConfigDto {
    return {
      slug: exp.slug,
      status: exp.status,
      winner: exp.winner,
      variants: exp.variants.map((v) => ({ slug: v.variantSlug, weight: v.weight })),
    };
  }
}
