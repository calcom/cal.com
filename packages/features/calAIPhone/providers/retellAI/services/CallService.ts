import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import type {
  AIPhoneServiceCall,
  AIPhoneServiceProviderType,
} from "../../../interfaces/AIPhoneService.interface";
import type { AgentRepositoryInterface } from "../../interfaces/AgentRepositoryInterface";
import type { RetellAIRepository, RetellCallListResponse, RetellDynamicVariables } from "../types";

interface RetellAIServiceInterface {
  updateToolsFromAgentId(
    agentId: string,
    data: { eventTypeId: number | null; timeZone: string; userId: number | null; teamId?: number | null }
  ): Promise<void>;
}

type Dependencies = {
  retellRepository: RetellAIRepository;
  agentRepository: AgentRepositoryInterface;
};

export class CallService {
  private logger = logger.getSubLogger({ prefix: ["CallService"] });
  private retellAIService?: RetellAIServiceInterface;

  constructor(private deps: Dependencies) {}

  setRetellAIService(service: RetellAIServiceInterface): void {
    this.retellAIService = service;
  }

  async createPhoneCall(data: {
    fromNumber: string;
    toNumber: string;
    dynamicVariables?: RetellDynamicVariables;
  }): Promise<AIPhoneServiceCall<AIPhoneServiceProviderType.RETELL_AI>> {
    if (!data.fromNumber?.trim()) {
      throw new HttpError({
        statusCode: 400,
        message: "From phone number is required and cannot be empty",
      });
    }

    if (!data.toNumber?.trim()) {
      throw new HttpError({
        statusCode: 400,
        message: "To phone number is required and cannot be empty",
      });
    }

    const { fromNumber, toNumber, dynamicVariables } = data;

    try {
      return await this.deps.retellRepository.createPhoneCall({
        fromNumber,
        toNumber,
        dynamicVariables,
      });
    } catch (error) {
      this.logger.error("Failed to create phone call in external AI service", {
        fromNumber: data.fromNumber,
        toNumber: data.toNumber,
        error,
      });
      throw new HttpError({
        statusCode: 500,
        message: `Failed to create phone call from ${data.fromNumber} to ${data.toNumber}`,
      });
    }
  }

  async createTestCall({
    agentId,
    phoneNumber,
    userId,
    teamId,
    timeZone,
    eventTypeId,
  }: {
    agentId: string;
    phoneNumber?: string;
    userId: number;
    teamId?: number;
    timeZone: string;
    eventTypeId: number;
  }) {
    if (!agentId?.trim()) {
      throw new HttpError({
        statusCode: 400,
        message: "Agent ID is required and cannot be empty",
      });
    }

    await this.validateCreditsForTestCall({ userId, teamId });

    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: `createTestCall:${userId}`,
    });

    const toNumber = phoneNumber?.trim();
    if (!toNumber) {
      throw new HttpError({
        statusCode: 400,
        message: "Phone number is required for test call",
      });
    }

    const agent = await this.deps.agentRepository.findByIdWithCallAccess({
      id: agentId,
      userId,
    });

    if (!agent) {
      throw new HttpError({
        statusCode: 404,
        message: "Agent not found or you don't have permission to use it.",
      });
    }

    const agentPhoneNumber = agent.outboundPhoneNumbers?.[0]?.phoneNumber;

    if (!agentPhoneNumber) {
      throw new HttpError({
        statusCode: 400,
        message: "Agent must have a phone number assigned to make calls.",
      });
    }

    if (!this.retellAIService) {
      this.logger.error("RetellAIService not configured before createTestCall");
      throw new HttpError({
        statusCode: 500,
        message: "Internal configuration error: AI phone service not initialized",
      });
    }

    const call = await this.createPhoneCall({
      fromNumber: agentPhoneNumber,
      toNumber: toNumber,
      dynamicVariables: {
        EVENT_NAME: "Test Call with Agent",
        EVENT_DATE: "Monday, January 15, 2025",
        EVENT_TIME: "2:00 PM",
        EVENT_END_TIME: "2:30 PM",
        TIMEZONE: timeZone,
        LOCATION: "Phone Call",
        ORGANIZER_NAME: "Cal.com AI Agent",
        ATTENDEE_NAME: "Test User",
        ATTENDEE_FIRST_NAME: "Test",
        ATTENDEE_LAST_NAME: "User",
        ATTENDEE_EMAIL: "testuser@example.com",
        ATTENDEE_TIMEZONE: timeZone,
        ADDITIONAL_NOTES: "This is a test call to verify the AI phone agent",
        EVENT_START_TIME_IN_ATTENDEE_TIMEZONE: "2:00 PM",
        EVENT_END_TIME_IN_ATTENDEE_TIMEZONE: "2:30 PM",
        eventTypeId: eventTypeId.toString(),
        NUMBER_TO_CALL: toNumber,
      },
    });

    return {
      callId: call.call_id,
      status: call.call_status,
      message: `Call initiated to ${toNumber} with call_id ${call.call_id}`,
    };
  }

  async createWebCall({
    agentId,
    userId,
    teamId,
    timeZone,
    eventTypeId,
  }: {
    agentId: string;
    userId: number;
    teamId?: number;
    timeZone: string;
    eventTypeId: number;
  }) {
    if (!agentId?.trim()) {
      throw new HttpError({
        statusCode: 400,
        message: "Agent ID is required and cannot be empty",
      });
    }

    await this.validateCreditsForTestCall({ userId, teamId });

    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: `createWebCall:${userId}`,
    });

    const agent = await this.deps.agentRepository.findByIdWithCallAccess({
      id: agentId,
      userId,
    });

    if (!agent) {
      throw new HttpError({
        statusCode: 404,
        message: "Agent not found or you don't have permission to use it.",
      });
    }

    if (!agent.providerAgentId) {
      throw new HttpError({
        statusCode: 400,
        message: "Agent provider ID not found.",
      });
    }

    const dynamicVariables = {
      EVENT_NAME: "Web Call Test with Agent",
      EVENT_DATE: "Monday, January 15, 2025",
      EVENT_TIME: "2:00 PM",
      EVENT_END_TIME: "2:30 PM",
      TIMEZONE: timeZone,
      LOCATION: "Web Call",
      ORGANIZER_NAME: "Cal.com AI Agent",
      ATTENDEE_NAME: "Test User",
      ATTENDEE_FIRST_NAME: "Test",
      ATTENDEE_LAST_NAME: "User",
      ATTENDEE_EMAIL: "testuser@example.com",
      ATTENDEE_TIMEZONE: timeZone,
      ADDITIONAL_NOTES: "This is a test web call to verify the AI phone agent",
      EVENT_START_TIME_IN_ATTENDEE_TIMEZONE: "2:00 PM",
      EVENT_END_TIME_IN_ATTENDEE_TIMEZONE: "2:30 PM",
      NUMBER_TO_CALL: "+919876543210",
      eventTypeId: eventTypeId.toString(),
    };

    try {
      const webCall = await this.deps.retellRepository.createWebCall({
        agentId: agent.providerAgentId,
        dynamicVariables,
      });
      return {
        callId: webCall.call_id,
        accessToken: webCall.access_token,
        agentId: webCall.agent_id,
      };
    } catch (error) {
      this.logger.error("Failed to create web call in external AI service", {
        agentId: agent.providerAgentId,
        error,
      });
      throw new HttpError({
        statusCode: 500,
        message: "Failed to create web call",
      });
    }
  }

  private async validateCreditsForTestCall({ userId, teamId }: { userId: number; teamId?: number }) {
    try {
      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
      const creditService = new CreditService();
      const hasCredits = await creditService.hasAvailableCredits({
        userId: userId || undefined,
        teamId: teamId || undefined,
      });

      if (!hasCredits) {
        throw new HttpError({
          statusCode: 403,
          message: `Insufficient credits to make test call. Please purchase more credits.`,
        });
      }
    } catch (error) {
      // Re-throw HTTP errors (like insufficient credits) as-is
      if (error instanceof HttpError) {
        throw error;
      }

      this.logger.error("Failed to validate credits for test call", {
        userId,
        teamId,
        error,
      });
      throw new HttpError({
        statusCode: 500,
        message: "Unable to validate credits. Please try again.",
      });
    }
  }

  async listCalls({
    limit = 50,
    offset: _offset = 0,
    filters,
  }: {
    limit?: number;
    offset?: number;
    filters: {
      fromNumber: string[];
      toNumber?: string[];
      startTimestamp?: { lower_threshold?: number; upper_threshold?: number };
    };
  }): Promise<RetellCallListResponse> {
    try {
      if (filters.fromNumber.length === 0) {
        this.logger.info("No phone numbers provided");
        return [];
      }

      const callsResponse = await this.deps.retellRepository.listCalls({
        filter_criteria: {
          from_number: filters.fromNumber,
          ...(filters?.toNumber && { to_number: filters.toNumber }),
          ...(filters?.startTimestamp && { start_timestamp: filters.startTimestamp }),
        },
        limit,
        sort_order: "descending",
      });

      return callsResponse.map((call) => {
        const { transcript_object: _transcript_object, call_cost: _call_cost, ...filteredCall } = call;
        return {
          ...filteredCall,
          sessionOutcome:
            call.call_status === "ended" && !call.disconnection_reason?.includes("error")
              ? "successful"
              : "unsuccessful",
        };
      }) as RetellCallListResponse;
    } catch (error) {
      this.logger.error("Failed to list calls", {
        phoneNumbers: filters?.fromNumber,
        error,
      });
      throw new HttpError({
        statusCode: 500,
        message: "Failed to retrieve call history",
      });
    }
  }
}
