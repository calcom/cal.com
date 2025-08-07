import type {
  PhoneNumberRepositoryInterface,
  PhoneNumberData,
} from "../interfaces/PhoneNumberRepositoryInterface";
import { PrismaPhoneNumberRepository } from "@calcom/lib/server/repository/PrismaPhoneNumberRepository";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";
import prisma from "@calcom/prisma";

/**
 * Adapter that bridges the provider interface to the Prisma implementation
 * This adapter provides a clean abstraction layer between provider and application
 */
export class PrismaPhoneNumberRepositoryAdapter implements PhoneNumberRepositoryInterface {
  async findByPhoneNumberAndUserId(params: {
    phoneNumber: string;
    userId: number;
  }): Promise<PhoneNumberData | null> {
    try {
      return await PrismaPhoneNumberRepository.findByPhoneNumberAndUserId(params);
    } catch (error) {
      // Return null if not found instead of throwing
      return null;
    }
  }

  async findByPhoneNumberAndTeamId(params: {
    phoneNumber: string;
    teamId: number;
    userId: number;
  }): Promise<PhoneNumberData | null> {
    return await PrismaPhoneNumberRepository.findByPhoneNumberAndTeamId(params);
  }

  async findByIdAndUserId(params: {
    id: number;
    userId: number;
  }): Promise<PhoneNumberData | null> {
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
    provider?: string;
    userId: number;
    teamId?: number;
    outboundAgentId?: string | null;
  }): Promise<PhoneNumberData> {
    // Map the interface to the actual implementation parameters
    const createParams = {
      phoneNumber: params.phoneNumber,
      provider: params.provider,
      userId: params.userId,
      teamId: params.teamId,
    };
    
    const result = await PrismaPhoneNumberRepository.createPhoneNumber(createParams);
    
    // Transform the result to match the interface
    return {
      ...result,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      inboundAgentId: null,
      outboundAgentId: params.outboundAgentId || null,
    };
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
    inboundRetellAgentId?: string | null;
    outboundRetellAgentId?: string | null;
  }): Promise<void> {
    await PrismaPhoneNumberRepository.updateAgents(params);
  }

}