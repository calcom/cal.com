
import type { Webhook } from "@calcom/prisma/client";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import type { Prisma } from "@prisma/client";

import { WebhookRepository } from "@/repositories/webhook.repository";

import { PrismaClient } from "@calcom/prisma";

import { BaseService } from "../base.service";

export class WebhookService extends BaseService {
  private webhookRepository: WebhookRepository;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.webhookRepository = new WebhookRepository(prisma);
  }

  async findByUserId(userId: number, limit: number, page: number) : Promise<Webhook[]> {
    try {
      const data = this.webhookRepository.findByUserId(userId, limit, page);
      return data
    } catch (error) {
      this.logError("findUserById", error);
      throw error;
    }
  }

}