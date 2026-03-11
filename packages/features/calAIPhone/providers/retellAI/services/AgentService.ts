import { isValidPhoneNumber } from "libphonenumber-js/max";
import { v4 as uuidv4 } from "uuid";

import { PrismaApiKeyRepository } from "@calcom/features/ee/api-keys/repositories/PrismaApiKeyRepository";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { RETELL_AI_TEST_MODE, RETELL_AI_TEST_EVENT_TYPE_MAP } from "@calcom/lib/constants";
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
import type { PhoneNumberRepositoryInterface } from "../../interfaces/PhoneNumberRepositoryInterface";
import { RetellAIServiceMapper } from "../RetellAIServiceMapper";
import type { RetellAIRepository, Language } from "../types";
import { getLlmId } from "../types";
import { replaceEventTypePlaceholders } from "../utils/promptUtils";

type Dependencies = {
  retellRepository: RetellAIRepository;
  agentRepository: AgentRepositoryInterface;
  phoneNumberRepository: PhoneNumberRepositoryInterface;
};

export class AgentService {
  private logger = logger.getSubLogger({ prefix: ["AgentService"] });
  constructor(private deps: Dependencies) {}

  private async createApiKey({ userId, teamId }: { userId: number; teamId?: number }) {
    const apiKeyRepository = await PrismaApiKeyRepository.withGlobalPrisma();
    return await apiKeyRepository.createApiKey({
      userId,
      teamId,
      expiresAt: null,
      note: `Cal.ai Phone API Key for agent ${userId} ${teamId ? `for team ${teamId}` : ""}`,
    });
  }

  async getAgent(agentId: string): Promise<AIPhoneServiceAgent<AIPhoneServiceProviderType.RETELL_AI>> {
    if (!agentId?.trim()) {
      throw new HttpError({
        statusCode: 400,
        message: "Agent ID is required and cannot be empty",
      });
    }

    try {
      return await this.deps.retellRepository.getAgent(agentId);
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

    let eventTypeId = data.eventTypeId;

    if (RETELL_AI_TEST_MODE && RETELL_AI_TEST_EVENT_TYPE_MAP) {
      const mappedId = RETELL_AI_TEST_EVENT_TYPE_MAP[String(data.eventTypeId)];
      eventTypeId = mappedId ? Number(mappedId) : data.eventTypeId;
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
      const llmDetails = await this.deps.retellRepository.getLLM(llmId);

      if (!llmDetails) {
        throw new HttpError({ statusCode: 404, message: "LLM details not found." });
      }

      const existing = llmDetails?.general_tools ?? [];

      const hasCheck = existing.some((t) => t.name === `check_availability_${eventTypeId}`);
      const hasBook = existing.some((t) => t.name === `book_appointment_${eventTypeId}`);
      // If both already exist and end_call also exists, nothing to do
      const hasEndCallAlready = existing.some((t) => t.type === "end_call");
      if (hasCheck && hasBook && hasEndCallAlready) {
        return;
      }

      const reusableKey = existing.find(
        (t): t is Extract<typeof t, { cal_api_key: string }> =>
          "cal_api_key" in t && typeof t.cal_api_key === "string"
      )?.cal_api_key;

      const apiKey =
        RETELL_AI_TEST_MODE && process.env.RETELL_AI_TEST_CAL_API_KEY
          ? process.env.RETELL_AI_TEST_CAL_API_KEY
          : (reusableKey ??
            (await this.createApiKey({
              userId: data.userId,
              teamId: data.teamId || undefined,
            })));

      const newEventTools: NonNullable<AIPhoneServiceTools<AIPhoneServiceProviderType.RETELL_AI>> = [];
      if (!hasCheck) {
        newEventTools.push({
          name: `check_availability_${eventTypeId}`,
          type: "check_availability_cal",
          event_type_id: eventTypeId,
          cal_api_key: apiKey,
          timezone: data.timeZone,
        });
      }
      if (!hasBook) {
        newEventTools.push({
          name: `book_appointment_${eventTypeId}`,
          type: "book_appointment_cal",
          event_type_id: eventTypeId,
          cal_api_key: apiKey,
          timezone: data.timeZone,
        });
      }

      if (!hasEndCallAlready) {
        newEventTools.unshift({
          type: "end_call",
          name: "end_call",
          description: "Hang up the call, triggered only after appointment successfully scheduled.",
        });
      }

      const updatedGeneralTools = [...existing, ...newEventTools];

      await this.deps.retellRepository.updateLLM(llmId, { general_tools: updatedGeneralTools });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      this.logger.error("Failed to update agent general tools in external AI service", {
        agentId,
        error,
      });
      throw new HttpError({
        statusCode: 500,
        message: `Failed to update agent general tools ${agentId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  }

  async removeToolsForEventTypes(agentId: string, eventTypeIds: number[]) {
    if (!agentId?.trim()) {
      throw new HttpError({
        statusCode: 400,
        message: "Agent ID is required and cannot be empty",
      });
    }

    if (!eventTypeIds.length) {
      return;
    }

    let mappedEventTypeIds = eventTypeIds;

    if (RETELL_AI_TEST_MODE && RETELL_AI_TEST_EVENT_TYPE_MAP) {
      mappedEventTypeIds = eventTypeIds.map((id) => {
        const mappedId = RETELL_AI_TEST_EVENT_TYPE_MAP[String(id)];
        return mappedId ? Number(mappedId) : id;
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

      const llmDetails = await this.deps.retellRepository.getLLM(llmId);

      if (!llmDetails) {
        throw new HttpError({ statusCode: 404, message: "LLM details not found." });
      }

      const existing = llmDetails?.general_tools ?? [];

      const toolNamesToRemove = mappedEventTypeIds.flatMap((eventTypeId) => [
        `check_availability_${eventTypeId}`,
        `book_appointment_${eventTypeId}`,
      ]);

      const filteredTools = existing.filter((tool) => !toolNamesToRemove.includes(tool.name));

      if (filteredTools.length !== existing.length) {
        await this.deps.retellRepository.updateLLM(llmId, { general_tools: filteredTools });
        this.logger.info("Removed event-specific tools from agent", {
          agentId,
          llmId,
          removedEventTypes: eventTypeIds,
          mappedEventTypes: RETELL_AI_TEST_MODE ? mappedEventTypeIds : undefined,
          toolsRemoved: existing.length - filteredTools.length,
        });
      }
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      this.logger.error("Failed to remove event-specific tools from agent", {
        agentId,
        eventTypeIds,
        error,
      });
      throw new HttpError({
        statusCode: 500,
        message: `Failed to remove tools for agent ${agentId}`,
      });
    }
  }

  async cleanupUnusedTools(agentId: string, activeEventTypeIds: number[] = []) {
    if (!agentId?.trim()) {
      throw new HttpError({
        statusCode: 400,
        message: "Agent ID is required and cannot be empty",
      });
    }

    let mappedActiveEventTypeIds = activeEventTypeIds;

    if (RETELL_AI_TEST_MODE && RETELL_AI_TEST_EVENT_TYPE_MAP) {
      mappedActiveEventTypeIds = activeEventTypeIds.map((id) => {
        const mappedId = RETELL_AI_TEST_EVENT_TYPE_MAP[String(id)];
        return mappedId ? Number(mappedId) : id;
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

      const llmDetails = await this.deps.retellRepository.getLLM(llmId);

      if (!llmDetails) {
        throw new HttpError({ statusCode: 404, message: "LLM details not found." });
      }

      const existing = llmDetails?.general_tools ?? [];

      const eventSpecificTools = existing.filter(
        (tool) => tool.name.includes("check_availability_") || tool.name.includes("book_appointment_")
      );

      const toolsToRemove = eventSpecificTools.filter((tool) => {
        // Extract event type ID from tool name
        const eventTypeIdMatch = tool.name.match(/_(\d+)$/);
        if (!eventTypeIdMatch) return false;

        const eventTypeId = parseInt(eventTypeIdMatch[1]);
        return !mappedActiveEventTypeIds.includes(eventTypeId);
      });

      if (toolsToRemove.length > 0) {
        const toolNamesToRemove = toolsToRemove.map((tool) => tool.name);
        const filteredTools = existing.filter((tool) => !toolNamesToRemove.includes(tool.name));

        await this.deps.retellRepository.updateLLM(llmId, { general_tools: filteredTools });

        this.logger.info("Cleaned up unused event-specific tools", {
          agentId,
          llmId,
          removedTools: toolsToRemove.length,
          toolNames: toolNamesToRemove,
        });

        return {
          removedCount: toolsToRemove.length,
          removedTools: toolNamesToRemove,
        };
      }

      return {
        removedCount: 0,
        removedTools: [],
      };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      this.logger.error("Failed to cleanup unused tools for agent", {
        agentId,
        activeEventTypeIds,
        mappedActiveEventTypeIds: RETELL_AI_TEST_MODE ? mappedActiveEventTypeIds : undefined,
        error,
      });
      throw new HttpError({
        statusCode: 500,
        message: `Failed to cleanup tools for agent ${agentId}`,
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
      throw new HttpError({ statusCode: 400, message: "Agent ID is required and cannot be empty" });
    }

    if (!data || Object.keys(data).length === 0) {
      throw new HttpError({ statusCode: 400, message: "Update data is required" });
    }

    try {
      const updateRequest = RetellAIServiceMapper.mapToUpdateAgentRequest(data);
      return await this.deps.retellRepository.updateAgent(agentId, updateRequest);
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
    const agents = await this.deps.agentRepository.findManyWithUserAccess({
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
    const agent = await this.deps.agentRepository.findByIdWithUserAccessAndDetails({
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

      const llmDetails = await this.deps.retellRepository.getLLM(llmId);

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

  async createOutboundAgent({
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
      const canManage = await this.deps.agentRepository.canManageTeamResources({
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

    const agent = await this.deps.agentRepository.create({
      name: agentName,
      providerAgentId: llmConfig.agentId,
      userId,
      teamId,
    });

    if (workflowStepId) {
      await this.deps.agentRepository.linkOutboundAgentToWorkflow({
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

  async createInboundAgent({
    name,
    phoneNumber,
    userId,
    teamId,
    workflowStepId,
    aiConfigurationService,
  }: {
    name?: string;
    phoneNumber: string;
    userId: number;
    teamId?: number;
    workflowStepId: number;
    aiConfigurationService: {
      setupInboundAIConfiguration: () => Promise<{ llmId: string; agentId: string }>;
    };
  }) {
    if (teamId) {
      const canManage = await this.deps.agentRepository.canManageTeamResources({
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

    const isPhoneNumberValid = isValidPhoneNumber(phoneNumber);
    if (!isPhoneNumberValid) {
      throw new HttpError({
        statusCode: 400,
        message: "Invalid phone number",
      });
    }

    let phoneNumberRecord;
    if (teamId) {
      phoneNumberRecord = await this.deps.phoneNumberRepository.findByPhoneNumberAndTeamId({
        phoneNumber,
        teamId,
        userId,
      });
    } else {
      phoneNumberRecord = await this.deps.phoneNumberRepository.findByPhoneNumberAndUserId({
        phoneNumber,
        userId,
      });
    }

    if (!phoneNumberRecord) {
      throw new HttpError({
        statusCode: 404,
        message: "Phone number not found or you don't have access to it",
      });
    }

    if (phoneNumberRecord.inboundAgentId) {
      throw new HttpError({
        statusCode: 400,
        message: "Inbound agent already configured for this phone number",
      });
    }

    const agentName = name || `Inbound Agent - ${workflowStepId}`;

    const llmConfig = await aiConfigurationService.setupInboundAIConfiguration();

    const agent = await this.deps.agentRepository.create({
      name: agentName,
      providerAgentId: llmConfig.agentId,
      userId,
      teamId,
    });

    await this.deps.agentRepository.linkInboundAgentToWorkflow({
      workflowStepId,
      agentId: agent.id,
    });

    // Update the Retell phone number with the new inbound agent ID
    await this.deps.retellRepository.updatePhoneNumber(phoneNumber, {
      inbound_agent_id: llmConfig.agentId,
    });

    const updateInboundAgentIdResult = await this.deps.phoneNumberRepository.updateInboundAgentId({
      id: phoneNumberRecord.id,
      agentId: agent.id,
    });

    if (updateInboundAgentIdResult.count === 0) {
      const conflictingAgentId = await this.deps.phoneNumberRepository.findInboundAgentIdByPhoneNumberId({
        phoneNumberId: phoneNumberRecord.id,
      });

      throw new HttpError({
        statusCode: 409,
        message: `Inbound agent was configured by another request. Conflicting agent: ${conflictingAgentId}`,
      });
    }

    return {
      id: agent.id,
      providerAgentId: agent.providerAgentId,
      message: "Inbound agent created successfully",
    };
  }

  async updateAgentConfiguration({
    id,
    userId,
    teamId,
    name: _name,
    generalPrompt,
    beginMessage,
    generalTools,
    voiceId,
    language,
    outboundEventTypeId,
    timeZone,
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
    language?: Language;
    outboundEventTypeId?: number;
    timeZone?: string;
    updateLLMConfiguration: (
      llmId: string,
      data: AIPhoneServiceUpdateModelParams<AIPhoneServiceProviderType.RETELL_AI>
    ) => Promise<AIPhoneServiceModel<AIPhoneServiceProviderType.RETELL_AI>>;
  }) {
    const agent = await this.deps.agentRepository.findByIdWithAdminAccess({
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

    const updatedPrompt =
      agent.inboundEventTypeId && generalPrompt
        ? replaceEventTypePlaceholders(generalPrompt, agent.inboundEventTypeId)
        : generalPrompt;

    const hasRetellUpdates =
      updatedPrompt !== undefined ||
      beginMessage !== undefined ||
      generalTools !== undefined ||
      voiceId !== undefined ||
      language !== undefined;

    if (hasRetellUpdates) {
      try {
        const retellAgent = await this.getAgent(agent.providerAgentId);
        const llmId = getLlmId(retellAgent);

        if (
          llmId &&
          (updatedPrompt !== undefined || beginMessage !== undefined || generalTools !== undefined)
        ) {
          const llmUpdateData = RetellAIServiceMapper.extractLLMUpdateData(
            updatedPrompt,
            beginMessage,
            generalTools
          );
          await updateLLMConfiguration(llmId, llmUpdateData);
        }

        if (voiceId || language) {
          const agentUpdateData: Parameters<typeof this.updateAgent>[1] = {};
          if (voiceId) agentUpdateData.voice_id = voiceId;
          if (language) agentUpdateData.language = language;
          await this.updateAgent(agent.providerAgentId, agentUpdateData);
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

    if (outboundEventTypeId && agent.outboundEventTypeId !== outboundEventTypeId) {
      const eventTypeRepository = new EventTypeRepository(prisma);

      const outBoundEventType = await eventTypeRepository.findByIdMinimal({
        id: outboundEventTypeId,
      });

      if (!outBoundEventType) {
        throw new HttpError({
          statusCode: 404,
          message: "Event type not found.",
        });
      }

      if (userId !== outBoundEventType.userId && teamId !== outBoundEventType.teamId) {
        throw new HttpError({
          statusCode: 403,
          message: "You don't have permission to use this event type.",
        });
      }

      const userTimeZone = timeZone || "UTC";
      await this.updateToolsFromAgentId(agent.providerAgentId, {
        eventTypeId: outboundEventTypeId,
        timeZone: userTimeZone,
        userId,
        teamId,
      });

      await this.deps.agentRepository.updateOutboundEventTypeId({
        agentId: id,
        eventTypeId: outboundEventTypeId,
      });
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
    const agent = await this.deps.agentRepository.findByIdWithAdminAccess({
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

    await this.deps.agentRepository.delete({ id });

    return { message: "Agent deleted successfully" };
  }
}
