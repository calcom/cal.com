import { v4 as uuidv4 } from "uuid";

import { TRPCError } from "@trpc/server";

import type { AgentRepositoryInterface } from "../../interfaces/AgentRepositoryInterface";
import { RetellAIServiceMapper } from "../RetellAIServiceMapper";
import type { RetellAIRepository, RetellAgent, RetellLLM, RetellLLMGeneralTools } from "../types";
import { getLlmId, Language } from "../types";

export class AgentService {
  constructor(
    private retellRepository: RetellAIRepository,
    private agentRepository: AgentRepositoryInterface
  ) {}

  async getAgent(agentId: string): Promise<RetellAgent> {
    return this.retellRepository.getAgent(agentId);
  }

  async updateAgent(
    agentId: string,
    data: {
      agent_name?: string | null;
      voice_id?: string;
      language?: Language;
      responsiveness?: number;
      interruption_sensitivity?: number;
    }
  ): Promise<RetellAgent> {
    const updateRequest = RetellAIServiceMapper.mapToUpdateAgentRequest(data);
    return this.retellRepository.updateAgent(agentId, updateRequest);
  }

  async listAgents({
    userId,
    teamId,
    scope = "all",
  }: {
    userId: number;
    teamId?: number;
    scope?: "personal" | "team" | "all";
  }) {
    const agents = await this.agentRepository.findManyWithUserAccess({
      userId,
      teamId,
      scope,
    });

    const formattedAgents = agents.map((agent) => RetellAIServiceMapper.formatAgentForList(agent));

    return {
      totalCount: formattedAgents.length,
      filtered: formattedAgents,
    };
  }

  async getAgentWithDetails({ id, userId, teamId }: { id: string; userId: number; teamId?: number }) {
    const agent = await this.agentRepository.findByIdWithUserAccessAndDetails({
      id,
      userId,
      teamId,
    });

    if (!agent) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Agent not found or you don't have permission to view it.",
      });
    }

    const retellAgent = await this.getAgent(agent.providerAgentId);
    const llmId = getLlmId(retellAgent);

    if (!llmId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Agent does not have an LLM configured.",
      });
    }

    const llmDetails = await this.retellRepository.getLLM(llmId);

    return RetellAIServiceMapper.formatAgentDetails(agent, retellAgent, llmDetails);
  }

  async createAgent({
    name: _name,
    userId,
    teamId,
    workflowStepId,
    setupAIConfiguration,
  }: {
    name?: string;
    userId: number;
    teamId?: number;
    workflowStepId?: number;
    setupAIConfiguration: () => Promise<{ llmId: string; agentId: string }>;
  }) {
    const agentName = _name || `Agent - ${userId} ${uuidv4()}`;

    if (teamId) {
      const canManage = await this.agentRepository.canManageTeamResources({
        userId,
        teamId,
      });
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to create agents for this team.",
        });
      }
    }

    const llmConfig = await setupAIConfiguration();

    const agent = await this.agentRepository.create({
      name: agentName,
      providerAgentId: llmConfig.agentId,
      userId,
      teamId,
    });

    if (workflowStepId) {
      await this.agentRepository.linkToWorkflowStep({
        workflowStepId,
        agentId: agent.id,
      });
    }

    return {
      id: agent.id,
      providerAgentId: agent.providerAgentId,
      message: "Agent created successfully",
    };
  }

  async updateAgentConfiguration({
    id,
    userId,
    name,
    generalPrompt,
    beginMessage,
    generalTools,
    voiceId,
    updateLLMConfiguration,
  }: {
    id: string;
    userId: number;
    name?: string;
    generalPrompt?: string | null;
    beginMessage?: string | null;
    generalTools?: RetellLLMGeneralTools;
    voiceId?: string;
    updateLLMConfiguration: (llmId: string, data: any) => Promise<RetellLLM>;
  }) {
    const agent = await this.agentRepository.findByIdWithAdminAccess({
      id,
      userId,
    });

    if (!agent) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Agent not found or you don't have permission to update it.",
      });
    }

    const hasRetellUpdates =
      generalPrompt !== undefined ||
      beginMessage !== undefined ||
      generalTools !== undefined ||
      voiceId !== undefined;

    if (hasRetellUpdates) {
      const retellAgent = await this.getAgent(agent.providerAgentId);
      const llmId = getLlmId(retellAgent);

      if (
        llmId &&
        (generalPrompt !== undefined || beginMessage !== undefined || generalTools !== undefined)
      ) {
        const llmUpdateData = RetellAIServiceMapper.extractLLMUpdateData(
          generalPrompt,
          beginMessage,
          generalTools
        );
        await updateLLMConfiguration(llmId, llmUpdateData);
      }

      if (voiceId) {
        await this.updateAgent(agent.providerAgentId, {
          voice_id: voiceId,
        });
      }
    }

    return { message: "Agent updated successfully" };
  }

  async deleteAgent({
    id,
    userId,
    teamId,
    deleteAIConfiguration,
  }: {
    id: string;
    userId: number;
    teamId?: number;
    deleteAIConfiguration: (config: { agentId: string; llmId?: string }) => Promise<void>;
  }) {
    const agent = await this.agentRepository.findByIdWithAdminAccess({
      id,
      userId,
      teamId,
    });

    if (!agent) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Agent not found or you don't have permission to delete it.",
      });
    }

    try {
      const retellAgent = await this.getAgent(agent.providerAgentId);
      const llmId = getLlmId(retellAgent);

      await deleteAIConfiguration({
        agentId: agent.providerAgentId,
        llmId: llmId || undefined,
      });
    } catch (error) {
      console.error("Failed to delete from Retell:", error);
    }

    await this.agentRepository.delete({ id });

    return { message: "Agent deleted successfully" };
  }
}
