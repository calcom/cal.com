import { getPhoneNumberRepository } from "@calcom/features/di/containers/RepositoryContainer";
import type { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import type {
  PhoneNumberRepositoryInterface,
  PhoneNumberData,
} from "../interfaces/PhoneNumberRepositoryInterface";

/**
 * Adapter that bridges the provider interface to the repository implementation
 * This adapter provides a clean abstraction layer between provider and application
 */
export class PhoneNumberRepositoryAdapter implements PhoneNumberRepositoryInterface {
  async findByPhoneNumberAndUserId(params: {
    phoneNumber: string;
    userId: number;
  }): Promise<PhoneNumberData | null> {
    const phoneNumberRepo = getPhoneNumberRepository();
    return await phoneNumberRepo.findByPhoneNumberAndUserId(params);
  }

  async findByPhoneNumberAndTeamId(params: {
    phoneNumber: string;
    teamId: number;
    userId: number;
  }): Promise<PhoneNumberData | null> {
    const phoneNumberRepo = getPhoneNumberRepository();
    return await phoneNumberRepo.findByPhoneNumberAndTeamId(params);
  }

  async findByIdAndUserId(params: { id: number; userId: number }): Promise<PhoneNumberData | null> {
    const phoneNumberRepo = getPhoneNumberRepository();
    return await phoneNumberRepo.findByIdAndUserId(params);
  }

  async findByIdWithTeamAccess(params: {
    id: number;
    teamId: number;
    userId: number;
  }): Promise<PhoneNumberData | null> {
    const phoneNumberRepo = getPhoneNumberRepository();
    return await phoneNumberRepo.findByIdWithTeamAccess(params);
  }

  async createPhoneNumber(params: {
    phoneNumber: string;
    provider: string;
    userId: number;
    teamId?: number;
    outboundAgentId?: string | null;
  }): Promise<PhoneNumberData> {
    const phoneNumberRepo = getPhoneNumberRepository();
    const createParams = {
      phoneNumber: params.phoneNumber,
      provider: params.provider,
      userId: params.userId,
      teamId: params.teamId,
    };

    return await phoneNumberRepo.createPhoneNumber(createParams);
  }

  async deletePhoneNumber(params: { phoneNumber: string }): Promise<void> {
    const phoneNumberRepo = getPhoneNumberRepository();
    await phoneNumberRepo.deletePhoneNumber(params);
  }

  async updateSubscriptionStatus(params: {
    id: number;
    subscriptionStatus: PhoneNumberSubscriptionStatus;
    disconnectAgents?: boolean;
  }): Promise<void> {
    const phoneNumberRepo = getPhoneNumberRepository();
    await phoneNumberRepo.updateSubscriptionStatus(params);
  }

  async updateAgents(params: {
    id: number;
    inboundProviderAgentId?: string | null;
    outboundProviderAgentId?: string | null;
  }): Promise<void> {
    const phoneNumberRepo = getPhoneNumberRepository();
    await phoneNumberRepo.updateAgents({
      id: params.id,
      inboundProviderAgentId: params.inboundProviderAgentId,
      outboundProviderAgentId: params.outboundProviderAgentId,
    });
  }

  async updateInboundAgentId(params: { id: number; agentId: string }): Promise<{ count: number }> {
    const phoneNumberRepo = getPhoneNumberRepository();
    return await phoneNumberRepo.updateInboundAgentId(params);
  }

  async findInboundAgentIdByPhoneNumberId(params: {
    phoneNumberId: number;
  }): Promise<{ inboundAgentId: string | null } | null> {
    const phoneNumberRepo = getPhoneNumberRepository();
    return await phoneNumberRepo.findInboundAgentIdByPhoneNumberId(params);
  }
}
