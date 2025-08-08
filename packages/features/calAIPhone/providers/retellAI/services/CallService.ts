import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";

import type {
  AIPhoneServiceProviderType,
  AIPhoneServiceCall,
} from "../../interfaces/AIPhoneService.interface";
import type { AgentRepositoryInterface } from "../../interfaces/AgentRepositoryInterface";
import type { RetellAIRepository, RetellDynamicVariables } from "../types";

const MIN_CREDIT_REQUIRED_FOR_TEST_CALL = 5;

export class CallService {
  private logger = logger.getSubLogger({ prefix: ["CallService"] });

  constructor(
    private retellRepository: RetellAIRepository,
    private agentRepository: AgentRepositoryInterface
  ) {}

  async createPhoneCall(data: {
    from_number: string;
    to_number: string;
    retell_llm_dynamic_variables?: RetellDynamicVariables;
  }): Promise<AIPhoneServiceCall<AIPhoneServiceProviderType.RETELL_AI>> {
    if (!data.from_number?.trim()) {
      throw new HttpError({
        statusCode: 400,
        message: "From phone number is required and cannot be empty",
      });
    }

    if (!data.to_number?.trim()) {
      throw new HttpError({
        statusCode: 400,
        message: "To phone number is required and cannot be empty",
      });
    }

    try {
      return await this.retellRepository.createPhoneCall({
        from_number: data.from_number,
        to_number: data.to_number,
        retell_llm_dynamic_variables: data.retell_llm_dynamic_variables,
      });
    } catch (error) {
      this.logger.error("Failed to create phone call in external AI service", {
        fromNumber: data.from_number,
        toNumber: data.to_number,
        error,
      });
      throw new HttpError({
        statusCode: 500,
        message: `Failed to create phone call from ${data.from_number} to ${data.to_number}`,
      });
    }
  }

  async createTestCall({
    agentId,
    phoneNumber,
    userId,
    teamId,
  }: {
    agentId: string;
    phoneNumber?: string;
    userId: number;
    teamId?: number;
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
      identifier: `test-call:${userId}`,
    });

    const toNumber = phoneNumber?.trim();
    if (!toNumber) {
      throw new HttpError({
        statusCode: 400,
        message: "Phone number is required for test call",
      });
    }

    const agent = await this.agentRepository.findByIdWithCallAccess({
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

    const call = await this.createPhoneCall({
      from_number: agentPhoneNumber,
      to_number: toNumber,
    });

    return {
      callId: call.call_id,
      status: call.call_status,
      message: `Call initiated to ${toNumber} with call_id ${call.call_id}`,
    };
  }

  private async validateCreditsForTestCall({ userId, teamId }: { userId: number; teamId?: number }) {
    try {
      const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
      const creditService = new CreditService();
      const credits = await creditService.getAllCredits({
        userId,
        teamId,
      });

      const availableCredits =
        (credits?.totalRemainingMonthlyCredits || 0) + (credits?.additionalCredits || 0);

      if (availableCredits < MIN_CREDIT_REQUIRED_FOR_TEST_CALL) {
        throw new HttpError({
          statusCode: 403,
          message: `Insufficient credits to make test call. Need ${MIN_CREDIT_REQUIRED_FOR_TEST_CALL} credits, have ${availableCredits}. Please purchase more credits.`,
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
}
