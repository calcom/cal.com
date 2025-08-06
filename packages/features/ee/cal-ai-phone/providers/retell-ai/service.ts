import { getStripeCustomerIdFromUserId } from "@calcom/app-store/stripepayment/lib/customer";
import { getPhoneNumberMonthlyPriceId } from "@calcom/app-store/stripepayment/lib/utils";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { WEBAPP_URL, IS_PRODUCTION } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type {
  AIPhoneServiceUpdateModelParams,
  AIPhoneServiceCreatePhoneNumberParams,
  AIPhoneServiceImportPhoneNumberParamsExtended,
} from "../../interfaces/ai-phone-service.interface";
import { DEFAULT_BEGIN_MESSAGE, DEFAULT_PROMPT_VALUE } from "../../promptTemplates";
import { RetellServiceMapper } from "./service-mappers";
import type {
  RetellLLM,
  RetellCall,
  RetellAgent,
  RetellPhoneNumber,
  RetellDynamicVariables,
  AIConfigurationSetup,
  AIConfigurationDeletion,
  DeletionResult,
  RetellAIRepository,
  RetellLLMGeneralTools,
  Language,
} from "./types";
import { getLlmId } from "./types";
const MIN_CREDIT_REQUIRED_FOR_TEST_CALL = 5;

export class RetellAIService {
  constructor(private repository: RetellAIRepository) {}



  async setupAIConfiguration(config: AIConfigurationSetup): Promise<{ llmId: string; agentId: string }> {
    const generalTools = RetellServiceMapper.buildGeneralTools(config);

    const llmRequest = RetellServiceMapper.mapToCreateLLMRequest(
      {
        ...config,
        generalPrompt: config.generalPrompt || DEFAULT_PROMPT_VALUE,
        beginMessage: config.beginMessage || DEFAULT_BEGIN_MESSAGE,
      },
      generalTools
    );
    const llm = await this.repository.createLLM(llmRequest);

    const agentRequest = RetellServiceMapper.mapToCreateAgentRequest(llm.llm_id, config.eventTypeId);
    const agent = await this.repository.createAgent(agentRequest);

    return { llmId: llm.llm_id, agentId: agent.agent_id };
  }

  async importPhoneNumber(data: AIPhoneServiceImportPhoneNumberParamsExtended): Promise<RetellPhoneNumber> {
    const { userId, agentId, teamId, ...rest } = data;
    const { AgentRepository } = await import("@calcom/lib/server/repository/agent");

    // Pre-check team permissions outside transaction
    if (teamId) {
      const canManage = await AgentRepository.canManageTeamResources({
        userId,
        teamId,
      });
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to import phone numbers for this team.",
        });
      }
    }

    let agent = null;
    if (agentId) {
      agent = await AgentRepository.findByIdWithUserAccess({
        agentId,
        userId,
      });

      if (!agent) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to use the selected agent.",
        });
      }
    }

    return await prisma.$transaction(async (tx) => {
      let importedPhoneNumber: RetellPhoneNumber | undefined = undefined;

      try {
        // Step 1: Import phone number in Retell
        importedPhoneNumber = await this.repository.importPhoneNumber({
          phone_number: rest.phone_number,
          termination_uri: rest.termination_uri,
          sip_trunk_auth_username: rest.sip_trunk_auth_username,
          sip_trunk_auth_password: rest.sip_trunk_auth_password,
          nickname: rest.nickname,
        });

        // Step 2: Create phone number record in database
        await tx.calAiPhoneNumber.create({
          data: {
            phoneNumber: importedPhoneNumber.phone_number,
            userId,
            provider: "Custom telephony",
            teamId,
            outboundAgentId: agent?.id || null,
          },
        });

        // Step 3: If agent is provided, update phone number in Retell
        if (agent) {
          try {
            await this.repository.updatePhoneNumber(importedPhoneNumber.phone_number, {
              outbound_agent_id: agent.retellAgentId,
            });
          } catch (retellError) {
            console.error("Failed to update phone number in Retell:", retellError);
            // Throw to trigger transaction rollback
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to configure phone number with agent in Retell service.",
            });
          }
        }

        return importedPhoneNumber;
      } catch (error) {
        // If we have an imported phone number but something else failed,
        // try to clean up the Retell phone number
        if (importedPhoneNumber?.phone_number) {
          try {
            await this.repository.deletePhoneNumber(importedPhoneNumber.phone_number);
          } catch (cleanupError) {
            console.error("Failed to cleanup Retell phone number:", cleanupError);
          }
        }

        // Re-throw the original error to trigger transaction rollback
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to import phone number",
        });
      }
    });
  }

  async deleteAIConfiguration(config: AIConfigurationDeletion): Promise<DeletionResult> {
    const result: DeletionResult = {
      success: true,
      errors: [],
      deleted: {
        llm: false,
        agent: false,
      },
    };

    if (config.agentId) {
      try {
        await this.repository.deleteAgent(config.agentId);
        result.deleted.agent = true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : `Failed to delete agent: ${error}`;
        result.errors.push(errorMessage);
        result.success = false;
      }
    } else {
      result.deleted.agent = true;
    }

    // Delete LLM
    if (config.llmId) {
      try {
        await this.repository.deleteLLM(config.llmId);
        result.deleted.llm = true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : `Failed to delete LLM: ${error}`;
        result.errors.push(errorMessage);
        result.success = false;
      }
    } else {
      result.deleted.llm = true; // No LLM to delete
    }

    return result;
  }

  /**
   * Update LLM configuration (for existing configurations)
   */
  async updateLLMConfiguration(llmId: string, data: AIPhoneServiceUpdateModelParams): Promise<RetellLLM> {
    const updateRequest = RetellServiceMapper.mapToUpdateLLMRequest(data);
    return this.repository.updateLLM(llmId, updateRequest);
  }

  async getLLMDetails(llmId: string): Promise<RetellLLM> {
    return this.repository.getLLM(llmId);
  }

  async getAgent(agentId: string): Promise<RetellAgent> {
    return this.repository.getAgent(agentId);
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
    const updateRequest = RetellServiceMapper.mapToUpdateAgentRequest(data);
    return this.repository.updateAgent(agentId, updateRequest);
  }

  async createPhoneCall(data: {
    from_number: string;
    to_number: string;
    retell_llm_dynamic_variables?: RetellDynamicVariables;
  }): Promise<RetellCall> {
    return this.repository.createPhoneCall({
      from_number: data.from_number,
      to_number: data.to_number,
      retell_llm_dynamic_variables: data.retell_llm_dynamic_variables,
    });
  }

  async createPhoneNumber(data: AIPhoneServiceCreatePhoneNumberParams): Promise<RetellPhoneNumber> {
    return this.repository.createPhoneNumber(data);
  }

  async deletePhoneNumber({
    phoneNumber,
    userId,
    teamId,
    deleteFromDB = false,
  }: {
    phoneNumber: string;
    userId: number;
    teamId?: number;
    deleteFromDB: boolean;
  }): Promise<void> {
    const { PhoneNumberRepository } = await import("@calcom/lib/server/repository/phoneNumber");

    const phoneNumberToDelete = teamId
      ? await PhoneNumberRepository.findByPhoneNumberAndTeamId({
          phoneNumber,
          teamId,
          userId,
        })
      : await PhoneNumberRepository.findMinimalPhoneNumber({
          phoneNumber,
          userId,
        });

    if (!phoneNumberToDelete) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Phone number not found or you don't have permission to delete it.",
      });
    }

    if (phoneNumberToDelete.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE) {
      throw new Error("Phone number is still active");
    }
    if (phoneNumberToDelete.subscriptionStatus === PhoneNumberSubscriptionStatus.CANCELLED) {
      throw new Error("Phone number is already cancelled");
    }

    try {
      await this.repository.updatePhoneNumber(phoneNumber, {
        inbound_agent_id: null,
        outbound_agent_id: null,
      });
    } catch (error) {
      // Log the error but continue with deletion
      console.error("Failed to remove agents from phone number in Retell:", error);
    }

    if (deleteFromDB) {
      await PhoneNumberRepository.deletePhoneNumber({ phoneNumber });
    }

    await this.repository.deletePhoneNumber(phoneNumber);
  }

  async getPhoneNumber(phoneNumber: string): Promise<RetellPhoneNumber> {
    return this.repository.getPhoneNumber(phoneNumber);
  }

  async updatePhoneNumber(
    phoneNumber: string,
    data: { inbound_agent_id?: string | null; outbound_agent_id?: string | null }
  ): Promise<RetellPhoneNumber> {
    return this.repository.updatePhoneNumber(phoneNumber, data);
  }

  async generatePhoneNumberCheckoutSession({
    userId,
    teamId,
    agentId,
    workflowId,
  }: {
    userId: number;
    teamId?: number;
    agentId?: string | null;
    workflowId?: string;
  }) {
    const phoneNumberPriceId = getPhoneNumberMonthlyPriceId();

    if (!phoneNumberPriceId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Phone number price ID not configured. Please contact support.",
      });
    }

    // Get or create Stripe customer
    const stripeCustomerId = await getStripeCustomerIdFromUserId(userId);
    if (!stripeCustomerId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Stripe customer.",
      });
    }

    // Create Stripe checkout session for phone number subscription
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [
        {
          price: phoneNumberPriceId,
          quantity: 1,
        },
      ],
      success_url: `${WEBAPP_URL}/api/phone-numbers/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${WEBAPP_URL}/workflows/${workflowId}`,
      allow_promotion_codes: true,
      customer_update: {
        address: "auto",
      },
      automatic_tax: {
        enabled: IS_PRODUCTION,
      },
      metadata: {
        userId: userId.toString(),
        teamId: teamId?.toString() || "",
        agentId: agentId || "",
        workflowId: workflowId || "",
        type: "phone_number_subscription",
      },
      subscription_data: {
        metadata: {
          userId: userId.toString(),
          teamId: teamId?.toString() || "",
          agentId: agentId || "",
          workflowId: workflowId || "",
          type: "phone_number_subscription",
        },
      },
    });

    if (!checkoutSession.url) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create checkout session.",
      });
    }

    return { url: checkoutSession.url, message: "Payment required to purchase phone number" };
  }

  async cancelPhoneNumberSubscription({
    phoneNumberId,
    userId,
    teamId,
  }: {
    phoneNumberId: number;
    userId: number;
    teamId?: number;
  }) {
    const { PhoneNumberRepository } = await import("@calcom/lib/server/repository/phoneNumber");

    // Find phone number with proper team authorization
    const phoneNumber = teamId
      ? await PhoneNumberRepository.findByIdWithTeamAccess({
          id: phoneNumberId,
          teamId,
          userId,
        })
      : await PhoneNumberRepository.findById({
          id: phoneNumberId,
          userId,
        });

    if (!phoneNumber) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Phone number not found or you don't have permission to cancel it.",
      });
    }

    if (!phoneNumber.stripeSubscriptionId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Phone number doesn't have an active subscription.",
      });
    }

    try {
      await stripe.subscriptions.cancel(phoneNumber.stripeSubscriptionId);

      await PhoneNumberRepository.updateSubscriptionStatus({
        id: phoneNumberId,
        subscriptionStatus: PhoneNumberSubscriptionStatus.CANCELLED,
        disconnectOutboundAgent: true,
      });

      // Delete the phone number from Retell, DB
      try {
        await this.repository.deletePhoneNumber(phoneNumber.phoneNumber);
      } catch (error) {
        console.error(
          "Failed to delete phone number from AI service, but subscription was cancelled:",
          error
        );
      }

      return { success: true, message: "Phone number subscription cancelled successfully." };
    } catch (error) {
      console.error("Error cancelling phone number subscription:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to cancel subscription. Please try again or contact support.",
      });
    }
  }

  async updatePhoneNumberWithAgents({
    phoneNumber,
    userId,
    teamId,
    inboundAgentId,
    outboundAgentId,
  }: {
    phoneNumber: string;
    userId: number;
    teamId?: number;
    inboundAgentId?: string | null;
    outboundAgentId?: string | null;
  }) {
    const { PhoneNumberRepository } = await import("@calcom/lib/server/repository/phoneNumber");
    const { AgentRepository } = await import("@calcom/lib/server/repository/agent");

    const phoneNumberRecord = teamId
      ? await PhoneNumberRepository.findByPhoneNumberAndTeamId({
          phoneNumber,
          teamId,
          userId,
        })
      : await PhoneNumberRepository.findByPhoneNumberAndUserId({
          phoneNumber,
          userId,
        });

    if (!phoneNumberRecord) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Phone number not found or you don't have permission to update it.",
      });
    }

    if (inboundAgentId) {
      const inboundAgent = await AgentRepository.findByRetellAgentIdWithUserAccess({
        retellAgentId: inboundAgentId,
        userId,
      });

      if (!inboundAgent) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to use the selected inbound agent.",
        });
      }

      if (teamId && inboundAgent.teamId !== teamId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Selected inbound agent does not belong to the specified team.",
        });
      }
    }

    if (outboundAgentId) {
      const outboundAgent = await AgentRepository.findByRetellAgentIdWithUserAccess({
        retellAgentId: outboundAgentId,
        userId,
      });

      if (!outboundAgent) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to use the selected outbound agent.",
        });
      }

      if (teamId && outboundAgent.teamId !== teamId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Selected outbound agent does not belong to the specified team.",
        });
      }
    }

    try {
      await this.getPhoneNumber(phoneNumber);

      const retellUpdateData = RetellServiceMapper.mapPhoneNumberUpdateData(inboundAgentId, outboundAgentId);

      if (Object.keys(retellUpdateData).length > 0) {
        await this.updatePhoneNumber(phoneNumber, retellUpdateData);
      }
    } catch (error: unknown) {
      // Check if it's a 404 error (phone number not found in Retell)
      if ((error as Error).message?.includes("404") || (error as Error).message?.includes("Not Found")) {
        console.log(`Phone number ${phoneNumber} not found in Retell - updating local database only`);
      } else {
        console.error("Failed to update phone number in AI service:", error);
      }
    }

    await PhoneNumberRepository.updateAgents({
      id: phoneNumberRecord.id,
      inboundRetellAgentId: inboundAgentId,
      outboundRetellAgentId: outboundAgentId,
    });

    return { message: "Phone number updated successfully" };
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
    const { AgentRepository } = await import("@calcom/lib/server/repository/agent");

    const agents = await AgentRepository.findManyWithUserAccess({
      userId,
      teamId,
      scope,
    });

    const formattedAgents = agents.map((agent) => RetellServiceMapper.formatAgentForList(agent));

    return {
      totalCount: formattedAgents.length,
      filtered: formattedAgents,
    };
  }

  async getAgentWithDetails({ id, userId, teamId }: { id: string; userId: number; teamId?: number }) {
    const { AgentRepository } = await import("@calcom/lib/server/repository/agent");

    const agent = await AgentRepository.findByIdWithUserAccessAndDetails({
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

    const retellAgent = await this.getAgent(agent.retellAgentId);
    const llmId = getLlmId(retellAgent);

    if (!llmId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Agent does not have an LLM configured.",
      });
    }

    const llmDetails = await this.getLLMDetails(llmId);

    return RetellServiceMapper.formatAgentDetails(agent, retellAgent, llmDetails);
  }

  async createAgent({
    name: _name,
    userId,
    teamId,
    workflowStepId,
    generalPrompt,
    beginMessage,
    generalTools,
    userTimeZone,
  }: {
    name?: string;
    userId: number;
    teamId?: number;
    workflowStepId?: number;
    generalPrompt?: string;
    beginMessage?: string;
    generalTools?: RetellLLMGeneralTools;
    userTimeZone: string;
  }) {
    const { AgentRepository } = await import("@calcom/lib/server/repository/agent");

    const agentName = _name || `Agent - ${userId} ${Math.random().toString(36).substring(2, 15)}`;

    if (teamId) {
      const canManage = await AgentRepository.canManageTeamResources({
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

    const llmConfig = await this.setupAIConfiguration({
      calApiKey: undefined,
      timeZone: userTimeZone,
      eventTypeId: undefined,
      generalPrompt,
      beginMessage,
      generalTools,
    });

    const agent = await AgentRepository.create({
      name: agentName,
      retellAgentId: llmConfig.agentId,
      userId,
      teamId,
    });

    if (workflowStepId) {
      await AgentRepository.linkToWorkflowStep({
        workflowStepId,
        agentId: agent.id,
      });
    }

    return {
      id: agent.id,
      retellAgentId: agent.retellAgentId,
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
  }: {
    id: string;
    userId: number;
    name?: string;
    generalPrompt?: string | null;
    beginMessage?: string | null;
    generalTools?: RetellLLMGeneralTools;
    voiceId?: string;
  }) {
    const { AgentRepository } = await import("@calcom/lib/server/repository/agent");

    const agent = await AgentRepository.findByIdWithAdminAccess({
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
      const retellAgent = await this.getAgent(agent.retellAgentId);
      const llmId = getLlmId(retellAgent);

      if (
        llmId &&
        (generalPrompt !== undefined || beginMessage !== undefined || generalTools !== undefined)
      ) {
        const llmUpdateData = RetellServiceMapper.extractLLMUpdateData(
          generalPrompt,
          beginMessage,
          generalTools
        );
        await this.updateLLMConfiguration(llmId, llmUpdateData);
      }

      if (voiceId) {
        await this.updateAgent(agent.retellAgentId, {
          voice_id: voiceId,
        });
      }
    }

    return { message: "Agent updated successfully" };
  }

  async deleteAgent({ id, userId }: { id: string; userId: number }) {
    const { AgentRepository } = await import("@calcom/lib/server/repository/agent");

    const agent = await AgentRepository.findByIdWithAdminAccess({
      id,
      userId,
    });

    if (!agent) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Agent not found or you don't have permission to delete it.",
      });
    }

    try {
      const retellAgent = await this.getAgent(agent.retellAgentId);
      const llmId = getLlmId(retellAgent);

      await this.deleteAIConfiguration({
        agentId: agent.retellAgentId,
        llmId: llmId || undefined,
      });
    } catch (error) {
      console.error("Failed to delete from Retell:", error);
    }

    await AgentRepository.delete({ id });

    return { message: "Agent deleted successfully" };
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
    const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
    const creditService = new CreditService();
    const credits = await creditService.getAllCredits({
      userId,
      teamId,
    });

    const availableCredits = (credits?.totalRemainingMonthlyCredits || 0) + (credits?.additionalCredits || 0);

    if (availableCredits < MIN_CREDIT_REQUIRED_FOR_TEST_CALL) {
      throw new Error(
        `Insufficient credits to make test call. Need ${requiredCredits} credits, have ${availableCredits}. Please purchase more credits.`
      );
    }

    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: `test-call:${userId}`,
    });

    const { AgentRepository } = await import("@calcom/lib/server/repository/agent");

    const toNumber = phoneNumber;
    if (!toNumber) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No phone number provided for test call.",
      });
    }

    const agent = await AgentRepository.findByIdWithCallAccess({
      id: agentId,
      userId,
    });

    if (!agent) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Agent not found or you don't have permission to use it.",
      });
    }

    const agentPhoneNumber = agent.outboundPhoneNumbers?.[0]?.phoneNumber;

    if (!agentPhoneNumber) {
      throw new TRPCError({
        code: "BAD_REQUEST",
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
}
