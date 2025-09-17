import { PrismaAgentRepository } from "@calcom/lib/server/repository/PrismaAgentRepository";

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
    return await PrismaAgentRepository.canManageTeamResources(params);
  }

  async findByIdWithUserAccess(params: { agentId: string; userId: number }): Promise<AgentData | null> {
    return await PrismaAgentRepository.findByIdWithUserAccess(params);
  }

  async findByProviderAgentIdWithUserAccess(params: {
    providerAgentId: string;
    userId: number;
  }): Promise<AgentData | null> {
    return await PrismaAgentRepository.findByProviderAgentIdWithUserAccess(params);
  }

  async findManyWithUserAccess(params: {
    userId: number;
    teamId?: number;
    scope?: "personal" | "team" | "all";
  }): Promise<AgentWithDetailsData[]> {
    return await PrismaAgentRepository.findManyWithUserAccess(params);
  }

  async findByIdWithUserAccessAndDetails(params: {
    id: string;
    userId: number;
    teamId?: number;
  }): Promise<AgentWithDetailsData | null> {
    return await PrismaAgentRepository.findByIdWithUserAccessAndDetails(params);
  }

  async create(params: {
    name: string;
    providerAgentId: string;
    userId: number;
    teamId?: number;
  }): Promise<AgentData> {
    return await PrismaAgentRepository.create(params);
  }

  async findByIdWithAdminAccess(params: {
    id: string;
    userId: number;
    teamId?: number;
  }): Promise<AgentData | null> {
    return await PrismaAgentRepository.findByIdWithAdminAccess(params);
  }

  async findByIdWithCallAccess(params: {
    id: string;
    userId: number;
  }): Promise<AgentWithPhoneNumbersData | null> {
    return await PrismaAgentRepository.findByIdWithCallAccess(params);
  }

  async delete(params: { id: string }): Promise<void> {
    await PrismaAgentRepository.delete(params);
  }

  async linkToWorkflowStep(params: { workflowStepId: number; agentId: string }): Promise<void> {
    await PrismaAgentRepository.linkToWorkflowStep(params);
  }

  async linkInboundAgentToWorkflow(params: { workflowId: number; agentId: string }): Promise<void> {
    await PrismaAgentRepository.linkInboundAgentToWorkflow(params);
  }
}
