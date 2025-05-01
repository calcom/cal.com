import { Injectable } from "@nestjs/common";
import { PrismaService } from "@calcom/prisma";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class OutlookSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSubscription(userId: number, resourceUrl: string, expirationTime: Date, clientState?: string) {
    const subscriptionId = uuidv4();
    return this.prisma.notificationsSubscriptions.create({
      data: {
        userId,
        subscription: "microsoft-graph",
        subscriptionId,
        resourceUrl,
        expirationTime,
        clientState,
      },
    });
  }

  async renewSubscription(subscriptionId: string, newExpirationTime: Date) {
    return this.prisma.notificationsSubscriptions.updateMany({
      where: { subscriptionId },
      data: { expirationTime: newExpirationTime },
    });
  }

  async deleteSubscription(subscriptionId: string) {
    return this.prisma.notificationsSubscriptions.deleteMany({
      where: { subscriptionId },
    });
  }

  async getExpiringSubscriptions(withinMinutes: number) {
    const now = new Date();
    const soon = new Date(now.getTime() + withinMinutes * 60 * 1000);
    return this.prisma.notificationsSubscriptions.findMany({
      where: {
        subscription: "microsoft-graph",
        expirationTime: { lte: soon, gte: now },
      },
    });
  }

  async getUserSubscriptions(userId: number) {
    return this.prisma.notificationsSubscriptions.findMany({
      where: { userId, subscription: "microsoft-graph" },
    });
  }

  async isValidClientState(clientState: string): Promise<boolean> {
    // Check if clientState exists in any active Microsoft Graph subscription
    const found = await this.prisma.notificationsSubscriptions.findFirst({
      where: { clientState, subscription: "microsoft-graph" },
    });
    return !!found;
  }
}
