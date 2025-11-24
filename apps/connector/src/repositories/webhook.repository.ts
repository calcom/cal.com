import type { PaginationQuery } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { NotFoundError } from "@/utils/error";

import { UserRepository as OldUserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma, User, UserPermissionRole, Webhook } from "@calcom/prisma/client";

import { WebhookInputData } from "../schema/webhook.schema";
import { BaseRepository } from "./base.repository";

export class WebhookRepository extends BaseRepository<Webhook> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findByUserId(userId: number, limit: number, page: number): Promise<Webhook[]> {
    try {
      const skip = (page - 1) * limit;

      const data = await this.prisma.webhook.findMany({
        where: { userId },
        skip,
        take: limit,
      });
      return data;
    } catch (error) {
      this.handleDatabaseError(error, "get webhooks by user id");
    }
  }

  async getById(id: string): Promise<Webhook | null> {
    try {
      const data = await this.prisma.webhook.findUnique({
        where: { id },
      });
      return data;
    } catch (error) {
      this.handleDatabaseError(error, "get webhook by id");
    }
  }

  async create(userId: number, data: WebhookInputData): Promise<Webhook> {
    try {
      const id = uuidv4();
      const webhook = await this.prisma.webhook.create({
        data: {
          ...data,
          id,
          userId,
        },
      });
      return webhook;
    } catch (error) {
      this.handleDatabaseError(error, "create webhook");
    }
  }

  async update(id: string, data: WebhookInputData): Promise<Webhook> {
    try {
      const webhook = await this.prisma.webhook.update({
        where: { id },
        data,
      });
      return webhook;
    } catch (error) {
      this.handleDatabaseError(error, "update webhook");
    }
  }

  async delete(id: string): Promise<Webhook> {
    try {
      const webhook = await this.prisma.webhook.delete({
        where: { id },
      });
      return webhook;
    } catch (error) {
      this.handleDatabaseError(error, "delete webhook");
    }
  }
}
