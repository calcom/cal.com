import { getAgentRepository } from "@calcom/features/di/containers/RepositoryContainer";

import type {
  AgentRepositoryInterface,
  AgentData,
  AgentWithDetailsData,
  AgentWithPhoneNumbersData,
} from "../interfaces/AgentRepositoryInterface";

/**
 * Adapter that bridges the provider interface to the Prisma implementation
 * This adapter provides a clean abstraction layer between provider and application
 */
export class PrismaAgentRepositoryAdapter implements AgentRepositoryInterface {
  async canManageTeamResources(params: { userId: number; teamId: number }): Promise<boolean> {
    const agentRepo = getAgentRepository();
    return await agentRepo.canManageTeamResources(params);
  }

  async findByIdWithUserAccess(params: { agentId: string; userId: number }): Promise<AgentData | null> {
    const agentRepo = getAgentRepository();
    return await agentRepo.findByIdWithUserAccess(params);
  }

  async findByProviderAgentIdWithUserAccess(params: {
    providerAgentId: string;
    userId: number;
  }): Promise<AgentData | null> {
    const agentRepo = getAgentRepository();
    return await agentRepo.findByProviderAgentIdWithUserAccess(params);
  }

  async findManyWithUserAccess(params: {
    userId: number;
    teamId?: number;
    scope?: "personal" | "team" | "all";
  }): Promise<AgentWithDetailsData[]> {
    const agentRepo = getAgentRepository();
    return await agentRepo.findManyWithUserAccess(params);
  }

  async findByIdWithUserAccessAndDetails(params: {
    id: string;
    userId: number;
    teamId?: number;
  }): Promise<AgentWithDetailsData | null> {
    const agentRepo = getAgentRepository();
    return await agentRepo.findByIdWithUserAccessAndDetails(params);
  }

  async create(params: {
    name: string;
    providerAgentId: string;
    userId: number;
    teamId?: number;
  }): Promise<AgentData> {
    const agentRepo = getAgentRepository();
    return await agentRepo.create(params);
  }

  async findByIdWithAdminAccess(params: {
    id: string;
    userId: number;
    teamId?: number;
  }): Promise<AgentData | null> {
    const agentRepo = getAgentRepository();
    return await agentRepo.findByIdWithAdminAccess(params);
  }

  async findByIdWithCallAccess(params: {
    id: string;
    userId: number;
  }): Promise<AgentWithPhoneNumbersData | null> {
    const agentRepo = getAgentRepository();
    return await agentRepo.findByIdWithCallAccess(params);
  }

  async delete(params: { id: string }): Promise<void> {
    const agentRepo = getAgentRepository();
    await agentRepo.delete(params);
  }

  async linkOutboundAgentToWorkflow(params: { workflowStepId: number; agentId: string }): Promise<void> {
    const agentRepo = getAgentRepository();
    await agentRepo.linkOutboundAgentToWorkflow(params);
  }

  async linkInboundAgentToWorkflow(params: { workflowStepId: number; agentId: string }): Promise<void> {
    const agentRepo = getAgentRepository();
    await agentRepo.linkInboundAgentToWorkflow(params);
  }

  async updateOutboundEventTypeId(params: { agentId: string; eventTypeId: number }): Promise<void> {
    const agentRepo = getAgentRepository();
    await agentRepo.updateOutboundEventTypeId(params);
  }
}
