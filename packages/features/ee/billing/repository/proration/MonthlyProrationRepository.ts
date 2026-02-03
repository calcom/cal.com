import type { PrismaClient } from "@calcom/prisma";
import { prisma as defaultPrisma } from "@calcom/prisma";
import type { MonthlyProration } from "@calcom/prisma/client";
import type { ProrationStatus } from "@calcom/prisma/enums";

export interface CreateProrationData {
  teamId: number;
  monthKey: string;
  periodStart: Date;
  periodEnd: Date;
  seatsAtStart: number;
  seatsAdded: number;
  seatsRemoved: number;
  netSeatIncrease: number;
  seatsAtEnd: number;
  subscriptionId: string;
  subscriptionItemId: string;
  customerId: string;
  subscriptionStart: Date;
  subscriptionEnd: Date;
  remainingDays: number;
  pricePerSeat: number;
  proratedAmount: number;
  teamBillingId: string | null;
  organizationBillingId: string | null;
}

export class MonthlyProrationRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma;
  }

  async createProration(data: CreateProrationData): Promise<MonthlyProration> {
    return await this.prisma.monthlyProration.create({
      data: {
        ...data,
        status: "PENDING" as ProrationStatus,
      },
    });
  }

  async updateProrationStatus(
    prorationId: string,
    status: ProrationStatus,
    additionalData?: {
      invoiceItemId?: string;
      invoiceId?: string;
      invoiceUrl?: string;
      chargedAt?: Date;
      failedAt?: Date;
      failureReason?: string;
      retryCount?: number;
    }
  ): Promise<MonthlyProration> {
    return await this.prisma.monthlyProration.update({
      where: { id: prorationId },
      data: {
        status,
        ...additionalData,
      },
    });
  }

  async findById(prorationId: string): Promise<MonthlyProration | null> {
    return await this.prisma.monthlyProration.findUnique({
      where: { id: prorationId },
    });
  }

  async findByTeamAndMonth(teamId: number, monthKey: string): Promise<MonthlyProration | null> {
    return await this.prisma.monthlyProration.findUnique({
      where: {
        teamId_monthKey: {
          teamId,
          monthKey,
        },
      },
    });
  }

  async incrementRetryCount(prorationId: string): Promise<MonthlyProration> {
    return await this.prisma.monthlyProration.update({
      where: { id: prorationId },
      data: {
        retryCount: {
          increment: 1,
        },
      },
    });
  }

  async findForEmail(prorationId: string) {
    return await this.prisma.monthlyProration.findUnique({
      where: { id: prorationId },
      select: {
        invoiceId: true,
        monthKey: true,
        netSeatIncrease: true,
        proratedAmount: true,
        status: true,
      },
    });
  }
}
