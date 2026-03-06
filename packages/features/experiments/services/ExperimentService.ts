import { BILLING_PLANS } from "@calcom/features/ee/billing/constants";
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

  async updateStatus(slug: string, status: ExperimentStatusType): Promise<void> {
    const experiment = await this.deps.experimentRepo.findBySlug(slug);
    if (!experiment) {
      throw ErrorWithCode.Factory.NotFound(`Experiment '${slug}' not found`);
    }
    await this.deps.experimentRepo.updateStatus(slug, status);
  }

  async updateVariantWeight(experimentSlug: string, variantSlug: string, weight: number): Promise<void> {
    const experiment = await this.deps.experimentRepo.findBySlug(experimentSlug);
    if (!experiment) {
      throw ErrorWithCode.Factory.NotFound(`Experiment '${experimentSlug}' not found`);
    }
    if (weight < 0 || weight > 100) {
      throw ErrorWithCode.Factory.BadRequest(`Weight must be between 0 and 100, got ${weight}`);
    }
    await this.deps.experimentRepo.updateVariantWeight(experimentSlug, variantSlug, weight);
  }

  async setWinner(slug: string, variantSlug: string | null): Promise<void> {
    const experiment = await this.deps.experimentRepo.findBySlug(slug);
    if (!experiment) {
      throw ErrorWithCode.Factory.NotFound(`Experiment '${slug}' not found`);
    }
    await this.deps.experimentRepo.setWinner(slug, variantSlug);
  }

  async getVariantsForUser(
    userId: number,
    userPlan: string,
    configs: ExperimentConfigDto[]
  ): Promise<Record<string, string | null>> {
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
