import { PrismaPhoneNumberRepository } from "@calcom/lib/server/repository/PrismaPhoneNumberRepository";
import type { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import type {
  PhoneNumberRepositoryInterface,
  PhoneNumberData,
} from "../interfaces/PhoneNumberRepositoryInterface";

/**
 * Adapter that bridges the provider interface to the Prisma implementation
 * This adapter provides a clean abstraction layer between provider and application
 */
export class PrismaPhoneNumberRepositoryAdapter implements PhoneNumberRepositoryInterface {
  async findByPhoneNumberAndUserId(params: {
    phoneNumber: string;
    userId: number;
  }): Promise<PhoneNumberData | null> {
    return await PrismaPhoneNumberRepository.findByPhoneNumberAndUserId(params);
  }

  async findByPhoneNumberAndTeamId(params: {
    phoneNumber: string;
    teamId: number;
    userId: number;
  }): Promise<PhoneNumberData | null> {
    return await PrismaPhoneNumberRepository.findByPhoneNumberAndTeamId(params);
  }

  async findByIdAndUserId(params: { id: number; userId: number }): Promise<PhoneNumberData | null> {
    return await PrismaPhoneNumberRepository.findByIdAndUserId(params);
  }

  async findByIdWithTeamAccess(params: {
    id: number;
    teamId: number;
    userId: number;
  }): Promise<PhoneNumberData | null> {
    return await PrismaPhoneNumberRepository.findByIdWithTeamAccess(params);
  }

  async createPhoneNumber(params: {
    phoneNumber: string;
    provider: string;
    userId: number;
    teamId?: number;
    outboundAgentId?: string | null;
  }): Promise<PhoneNumberData> {
    const createParams = {
      phoneNumber: params.phoneNumber,
      provider: params.provider,
      userId: params.userId,
      teamId: params.teamId,
    };

    return await PrismaPhoneNumberRepository.createPhoneNumber(createParams);
  }

  async deletePhoneNumber(params: { phoneNumber: string }): Promise<void> {
    await PrismaPhoneNumberRepository.deletePhoneNumber(params);
  }

  async updateSubscriptionStatus(params: {
    id: number;
    subscriptionStatus: PhoneNumberSubscriptionStatus;
    disconnectOutboundAgent?: boolean;
  }): Promise<void> {
    await PrismaPhoneNumberRepository.updateSubscriptionStatus(params);
  }

  async updateAgents(params: {
    id: number;
    inboundProviderAgentId?: string | null;
    outboundProviderAgentId?: string | null;
  }): Promise<void> {
    await PrismaPhoneNumberRepository.updateAgents({
      id: params.id,
      inboundProviderAgentId: params.inboundProviderAgentId,
      outboundProviderAgentId: params.outboundProviderAgentId,
    });
  }
}
