
import type { Webhook } from "@calcom/prisma/client";
import { WebhookInputData } from "../schema/webhook.schema";
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

  async getById(id: string) : Promise<Webhook | null> {
    try {
      const data = this.webhookRepository.getById(id);
      return data
    } catch (error) {
      this.logError("getById", error);
      throw error;
    }
  }

  async create(userId: number, data: WebhookInputData): Promise<Webhook> {
    try {
      const webhook = await this.webhookRepository.create(userId, data);
      return webhook;
    } catch (error) {
      this.logError("create", error);
      throw error;
    }
  }


  async update(id: string, data: WebhookInputData) : Promise<Webhook> {
    try {
      const webhook = await this.webhookRepository.update(id, data);
      return webhook;
    } catch (error) {
      this.logError("update", error);
      throw error;
    }
  }

  async delete(id: string) : Promise<Webhook> {
    try {
      const webhook = await this.webhookRepository.delete(id);
      return webhook;
    } catch (error) {
      this.logError("delete", error);
      throw error;
    }
  }
}