import type { PrismaClient } from "@calcom/prisma/client";
import { ExperimentStatus } from "@calcom/prisma/client";
import type { ExperimentStatusType } from "../types";
import type { ExperimentWithVariants, IExperimentRepository } from "./IExperimentRepository";

const STATUS_TO_PRISMA: Record<ExperimentStatusType, ExperimentStatus> = {
  DRAFT: ExperimentStatus.DRAFT,
  RUNNING: ExperimentStatus.RUNNING,
  STOPPED: ExperimentStatus.STOPPED,
  ROLLED_OUT: ExperimentStatus.ROLLED_OUT,
};

const experimentSelect = {
  slug: true,
  status: true,
  winner: true,
  variants: {
    select: {
      variantSlug: true,
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

  async updateStatus(slug: string, status: ExperimentStatusType, now?: Date): Promise<void> {
    const prismaStatus = STATUS_TO_PRISMA[status];
    const data: Record<string, unknown> = { status: prismaStatus };
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

  async updateVariantWeight(experimentSlug: string, variantSlug: string, weight: number): Promise<void> {
    await this.prisma.experimentVariant.upsert({
      where: {
        experimentSlug_variantSlug: { experimentSlug, variantSlug },
      },
      update: { weight },
      create: { experimentSlug, variantSlug, weight },
    });
  }

  async setWinner(slug: string, variantSlug: string | null): Promise<void> {
    await this.prisma.experiment.update({
      where: { slug },
      data: { winner: variantSlug, status: ExperimentStatus.ROLLED_OUT, stoppedAt: new Date() },
    });
  }
}
