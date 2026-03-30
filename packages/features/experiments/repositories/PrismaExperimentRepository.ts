import type { PrismaClient } from "@calcom/prisma/client";
import { ExperimentStatus } from "@calcom/prisma/client";
import type { ExperimentStatusType } from "../types";
import type {
  ExperimentWithVariants,
  IExperimentRepository,
  SetWinnerInput,
  UpdateStatusInput,
  UpdateVariantWeightInput,
} from "./IExperimentRepository";

const STATUS_TO_PRISMA: Record<ExperimentStatusType, ExperimentStatus> = {
  DRAFT: ExperimentStatus.DRAFT,
  RUNNING: ExperimentStatus.RUNNING,
  STOPPED: ExperimentStatus.STOPPED,
  ROLLED_OUT: ExperimentStatus.ROLLED_OUT,
};

const experimentSelect = {
  slug: true,
  label: true,
  description: true,
  status: true,
  winner: true,
  variants: {
    select: {
      variantSlug: true,
      label: true,
      weight: true,
    },
  },
} as const;

export class PrismaExperimentRepository implements IExperimentRepository {
  constructor(private prisma: PrismaClient) {}

  async findBySlug(slug: string): Promise<ExperimentWithVariants | null> {
    return this.prisma.experiment.findUnique({
      where: { slug },
      select: experimentSelect,
    });
  }

  async findAllRunning(): Promise<ExperimentWithVariants[]> {
    return this.prisma.experiment.findMany({
      where: { status: ExperimentStatus.RUNNING },
      select: experimentSelect,
    });
  }

  async findAll(): Promise<ExperimentWithVariants[]> {
    return this.prisma.experiment.findMany({
      orderBy: { createdAt: "desc" },
      select: experimentSelect,
    });
  }

  async updateStatus({ slug, status, userId, now }: UpdateStatusInput): Promise<void> {
    const prismaStatus = STATUS_TO_PRISMA[status];
    const data: Record<string, unknown> = { status: prismaStatus, updatedById: userId };
    const timestamp = now ?? new Date();

    if (prismaStatus === ExperimentStatus.RUNNING) {
      data.startedAt = timestamp;
    } else if (prismaStatus === ExperimentStatus.STOPPED || prismaStatus === ExperimentStatus.ROLLED_OUT) {
      data.stoppedAt = timestamp;
    }

    await this.prisma.experiment.update({
      where: { slug },
      data,
    });
  }

  async updateVariantWeight({ experimentSlug, variantSlug, weight, userId }: UpdateVariantWeightInput): Promise<void> {
    await this.prisma.experimentVariant.upsert({
      where: {
        experimentSlug_variantSlug: { experimentSlug, variantSlug },
      },
      update: { weight, updatedById: userId },
      create: { experimentSlug, variantSlug, weight, createdById: userId, updatedById: userId },
    });
  }

  async setWinner({ slug, variantSlug, userId }: SetWinnerInput): Promise<void> {
    await this.prisma.experiment.update({
      where: { slug },
      data: { winner: variantSlug, status: ExperimentStatus.ROLLED_OUT, stoppedAt: new Date(), updatedById: userId },
    });
  }
}
