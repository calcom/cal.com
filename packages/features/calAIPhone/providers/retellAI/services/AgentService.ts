import { v4 as uuidv4 } from "uuid";

import { generateUniqueAPIKey as generateHashedApiKey } from "@calcom/ee/api-keys/lib/apiKeys";
import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import type {
  AIPhoneServiceUpdateModelParams,
  AIPhoneServiceProviderType,
  AIPhoneServiceAgent,
  AIPhoneServiceModel,
  AIPhoneServiceTools,
} from "../../../interfaces/AIPhoneService.interface";
import type { AgentRepositoryInterface } from "../../interfaces/AgentRepositoryInterface";
import { RetellAIServiceMapper } from "../RetellAIServiceMapper";
import type { RetellAIRepository, Language } from "../types";
import { getLlmId } from "../types";

export class AgentService {
  private logger = logger.getSubLogger({ prefix: ["AgentService"] });

  constructor(
    private retellRepository: RetellAIRepository,
    private agentRepository: AgentRepositoryInterface
  ) {}

  private async createApiKey({ userId, teamId }: { userId: number; teamId?: number }) {
    const [hashedApiKey, apiKey] = generateHashedApiKey();
    await prisma.apiKey.create({
      data: {
        id: uuidv4(),
        userId,
        teamId,
        // And here we pass a null to expiresAt if never expires is true
        expiresAt: null,
        hashedKey: hashedApiKey,
        note: `Cal AI Phone API Key for agent ${userId} ${teamId ? `for team ${teamId}` : ""}`,
      },
    });

    const apiKeyPrefix = process.env.API_KEY_PREFIX ?? "cal_";

    const prefixedApiKey = `${apiKeyPrefix}${apiKey}`;

    return prefixedApiKey;
  }

  async getAgent(agentId: string): Promise<AIPhoneServiceAgent<AIPhoneServiceProviderType.RETELL_AI>> {
    if (!agentId?.trim()) {
      throw new HttpError({
        statusCode: 400,
        message: "Agent ID is required and cannot be empty",
      });
    }

    try {
      return await this.retellRepository.getAgent(agentId);
    } catch (error) {
      this.logger.error("Failed to get agent from external AI service", {
        agentId,
        error,
      });
      throw new HttpError({
        statusCode: 500,
        message: `Failed to get agent ${agentId}`,
      });
    }
  }

  async updateToolsFromAgentId(
    agentId: string,
    data: { eventTypeId: number | null; timeZone: string; userId: number | null; teamId?: number | null }
  ) {
    if (!agentId?.trim()) {
      throw new HttpError({
        statusCode: 400,
        message: "Agent ID is required and cannot be empty",
      });
    }

    if (!data.eventTypeId || !data.userId) {
      throw new HttpError({
        statusCode: 400,
        message: "Event type ID and user ID are required",
      });
    }

    if (!timeZoneSchema.safeParse(data.timeZone).success) {
      throw new HttpError({
        statusCode: 400,
        message: "Invalid time zone",
      });
    }

    try {
      const agent = await this.getAgent(agentId);
      const llmId = getLlmId(agent);

      if (!llmId) {
        throw new HttpError({
          statusCode: 404,
          message: "Agent does not have an LLM configured.",
        });
      }
      const llmDetails = await this.retellRepository.getLLM(llmId);

      if (!llmDetails) {
        throw new HttpError({ statusCode: 404, message: "LLM details not found." });
      }

      const existing: AIPhoneServiceTools<AIPhoneServiceProviderType.RETELL_AI>[] =
        llmDetails.general_tools ?? [];

      const hasCheckAvailability = existing.some(
        (t) => t.type === "check_availability_cal" && t.event_type_id === data.eventTypeId
      );

      if (hasCheckAvailability) {
        // If the event type ID does exist in the general tools, we don't need to update the agent general tools
        return;
      }

      const reusableKey = existing.find(
        (t) => "cal_api_key" in t && typeof t.cal_api_key === "string"
      )?.cal_api_key;

      const apiKey =
        reusableKey ??
        (await this.createApiKey({
          userId: data.userId,
          teamId: data.teamId || undefined,
        }));

      const newGeneralTools: AIPhoneServiceTools<AIPhoneServiceProviderType.RETELL_AI>[] = [
        {
          type: "end_call",
          name: "end_call",
          description: "Hang up the call, triggered only after appointment successfully scheduled.",
        },
        {
          name: "check_availability",
          type: "check_availability_cal",
          event_type_id: data.eventTypeId,
          cal_api_key: apiKey,
          timezone: data.timeZone,
        },
        {
          name: "book_appointment",
          type: "book_appointment_cal",
          event_type_id: data.eventTypeId,
          cal_api_key: apiKey,
          timezone: data.timeZone,
        },
      ];

      await this.retellRepository.updateLLM(llmId, { general_tools: newGeneralTools });
    } catch (error) {
      this.logger.error("Failed to update agent general tools in external AI service", {
        agentId,
        error,
      });
      throw new HttpError({
        statusCode: 500,
        message: `Failed to update agent general tools ${agentId}`,
      });
    }
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
  ): Promise<AIPhoneServiceAgent<AIPhoneServiceProviderType.RETELL_AI>> {
    if (!agentId?.trim()) {
      throw new HttpError("Agent ID is required and cannot be empty");
    }

    if (!data || Object.keys(data).length === 0) {
      throw new HttpError({ statusCode: 400, message: "Update data is required" });
    }

    try {
      const updateRequest = RetellAIServiceMapper.mapToUpdateAgentRequest(data);
      return await this.retellRepository.updateAgent(agentId, updateRequest);
    } catch (error) {
      this.logger.error("Failed to update agent in external AI service", {
        agentId,
        data,
        error,
      });
      throw new HttpError({
        statusCode: 500,
        message: `Failed to update agent ${agentId}`,
      });
    }
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
      throw new HttpError({
        statusCode: 404,
        message: "Agent not found or you don't have permission to view it.",
      });
    }

    try {
      const retellAgent = await this.getAgent(agent.providerAgentId);
      const llmId = getLlmId(retellAgent);

      if (!llmId) {
        throw new HttpError({
          statusCode: 404,
          message: "Agent does not have an LLM configured.",
        });
      }

      const llmDetails = await this.retellRepository.getLLM(llmId);

      return RetellAIServiceMapper.formatAgentDetails(agent, retellAgent, llmDetails);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      this.logger.error("Failed to get agent details from external AI service", {
        agentId: id,
        providerAgentId: agent.providerAgentId,
        userId,
        teamId,
        error,
      });
      throw new HttpError({
        statusCode: 500,
        message: "Unable to fetch agent details. Please try again.",
      });
    }
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
        throw new HttpError({
          statusCode: 403,
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
    teamId,
    name,
    generalPrompt,
    beginMessage,
    generalTools,
    voiceId,
    updateLLMConfiguration,
  }: {
    id: string;
    userId: number;
    teamId?: number;
    name?: string;
    generalPrompt?: string | null;
    beginMessage?: string | null;
    generalTools?: AIPhoneServiceTools<AIPhoneServiceProviderType.RETELL_AI>;
    voiceId?: string;
    updateLLMConfiguration: (
      llmId: string,
      data: AIPhoneServiceUpdateModelParams<AIPhoneServiceProviderType.RETELL_AI>
    ) => Promise<AIPhoneServiceModel<AIPhoneServiceProviderType.RETELL_AI>>;
  }) {
    const agent = await this.agentRepository.findByIdWithAdminAccess({
      id,
      userId,
      teamId,
    });

    if (!agent) {
      throw new HttpError({
        statusCode: 404,
        message: "Agent not found or you don't have permission to update it.",
      });
    }

    const hasRetellUpdates =
      generalPrompt !== undefined ||
      beginMessage !== undefined ||
      generalTools !== undefined ||
      voiceId !== undefined;

    if (hasRetellUpdates) {
      try {
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
      } catch (error) {
        this.logger.error("Failed to update agent configuration in external AI service", {
          agentId: id,
          providerAgentId: agent.providerAgentId,
          userId,
          updates: {
            generalPrompt: !!generalPrompt,
            beginMessage: !!beginMessage,
            generalTools: !!generalTools,
            voiceId: !!voiceId,
          },
          error,
        });

        if (error instanceof HttpError) {
          throw error;
        }

        throw new HttpError({
          statusCode: 500,
          message: "Unable to update agent configuration. Please try again.",
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
      throw new HttpError({
        statusCode: 404,
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
      this.logger.error("Failed to delete agent from external AI service", {
        agentId: id,
        providerAgentId: agent.providerAgentId,
        userId,
        teamId,
        error,
      });
    }

    await this.agentRepository.delete({ id });

    return { message: "Agent deleted successfully" };
  }
}
