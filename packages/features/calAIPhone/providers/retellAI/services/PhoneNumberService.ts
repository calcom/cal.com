import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type {
  AIPhoneServiceCreatePhoneNumberParams,
  AIPhoneServiceImportPhoneNumberParamsExtended,
} from "../../../interfaces/ai-phone-service.interface";
import type { AgentRepositoryInterface } from "../../interfaces/AgentRepositoryInterface";
import type { PhoneNumberRepositoryInterface } from "../../interfaces/PhoneNumberRepositoryInterface";
import type { TransactionInterface } from "../../interfaces/TransactionInterface";
import { RetellAIServiceMapper } from "../RetellAIServiceMapper";
import type { RetellAIRepository, RetellPhoneNumber } from "../types";

export class PhoneNumberService {
  constructor(
    private retellRepository: RetellAIRepository,
    private agentRepository: AgentRepositoryInterface,
    private phoneNumberRepository: PhoneNumberRepositoryInterface,
    private transactionManager: TransactionInterface
  ) {}

  async importPhoneNumber(data: AIPhoneServiceImportPhoneNumberParamsExtended): Promise<RetellPhoneNumber> {
    const { userId, agentId, teamId, ...rest } = data;

    await this.validateTeamPermissions(userId, teamId);
    const agent = await this.validateAgentPermissions(userId, agentId);

    let transactionState = {
      retellPhoneNumber: null as RetellPhoneNumber | null,
      databaseRecordCreated: false,
      agentAssigned: false
    };

    try {
      return await this.transactionManager.executeInTransaction(async (txContext) => {
        transactionState.retellPhoneNumber = await this.retellRepository.importPhoneNumber({
          phone_number: rest.phone_number,
          termination_uri: rest.termination_uri,
          sip_trunk_auth_username: rest.sip_trunk_auth_username,
          sip_trunk_auth_password: rest.sip_trunk_auth_password,
          nickname: rest.nickname,
        });

        await txContext.phoneNumberRepository.createPhoneNumber({
          phoneNumber: transactionState.retellPhoneNumber.phone_number,
          userId,
          provider: "custom-telephony",
          teamId,
          outboundAgentId: agent?.id || null,
        });
        transactionState.databaseRecordCreated = true;

        if (agent) {
          await this.retellRepository.updatePhoneNumber(transactionState.retellPhoneNumber.phone_number, {
            outbound_agent_id: agent.providerAgentId,
          });
          transactionState.agentAssigned = true;
        }

        return transactionState.retellPhoneNumber;
      });
    } catch (error) {
      await this.handleCompensatingTransaction(transactionState, error, { userId, teamId, agentId });
      throw error;
    }
  }

  async createPhoneNumber(data: AIPhoneServiceCreatePhoneNumberParams): Promise<RetellPhoneNumber> {
    return this.retellRepository.createPhoneNumber(data);
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
    const phoneNumberToDelete = teamId
      ? await this.phoneNumberRepository.findByPhoneNumberAndTeamId({
          phoneNumber,
          teamId,
          userId,
        })
      : await this.phoneNumberRepository.findByPhoneNumberAndUserId({
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
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Phone number is still active",
      });
    }
    if (phoneNumberToDelete.subscriptionStatus === PhoneNumberSubscriptionStatus.CANCELLED) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Phone number is already cancelled",
      });
    }

    try {
      await this.retellRepository.updatePhoneNumber(phoneNumber, {
        inbound_agent_id: null,
        outbound_agent_id: null,
      });
    } catch (error) {
      console.error("Failed to remove agents from phone number in Retell:", error);
    }

    await this.retellRepository.deletePhoneNumber(phoneNumber);

    if (deleteFromDB) {
      await this.phoneNumberRepository.deletePhoneNumber({ phoneNumber });
    }
  }

  async getPhoneNumber(phoneNumber: string): Promise<RetellPhoneNumber> {
    return this.retellRepository.getPhoneNumber(phoneNumber);
  }

  async updatePhoneNumber(
    phoneNumber: string,
    data: { inbound_agent_id?: string | null; outbound_agent_id?: string | null }
  ): Promise<RetellPhoneNumber> {
    return this.retellRepository.updatePhoneNumber(phoneNumber, data);
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
    const phoneNumberRecord = teamId
      ? await this.phoneNumberRepository.findByPhoneNumberAndTeamId({
          phoneNumber,
          teamId,
          userId,
        })
      : await this.phoneNumberRepository.findByPhoneNumberAndUserId({
          phoneNumber,
          userId,
        });

    if (!phoneNumberRecord) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Phone number not found or you don't have permission to update it.",
      });
    }

    await this.validateAgentAccess(userId, teamId, inboundAgentId, "inbound");
    await this.validateAgentAccess(userId, teamId, outboundAgentId, "outbound");

    try {
      await this.getPhoneNumber(phoneNumber);

      const retellUpdateData = RetellAIServiceMapper.mapPhoneNumberUpdateData(inboundAgentId, outboundAgentId);

      if (Object.keys(retellUpdateData).length > 0) {
        await this.updatePhoneNumber(phoneNumber, retellUpdateData);
      }
    } catch (error: unknown) {
      if ((error as Error).message?.includes("404") || (error as Error).message?.includes("Not Found")) {
        console.log(`Phone number ${phoneNumber} not found in Retell - updating local database only`);
      } else {
        console.error("Failed to update phone number in AI service:", error);
      }
    }

    await this.phoneNumberRepository.updateAgents({
      id: phoneNumberRecord.id,
      inboundProviderAgentId: inboundAgentId,
      outboundProviderAgentId: outboundAgentId,
    });

    return { message: "Phone number updated successfully" };
  }

  private async validateTeamPermissions(userId: number, teamId?: number) {
    if (teamId) {
      const canManage = await this.agentRepository.canManageTeamResources({
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
  }

  private async validateAgentPermissions(userId: number, agentId?: string) {
    let agent = null;
    if (agentId) {
      agent = await this.agentRepository.findByIdWithUserAccess({
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
    return agent;
  }

  private async validateAgentAccess(
    userId: number,
    teamId: number | undefined,
    agentId: string | null | undefined,
    type: "inbound" | "outbound"
  ) {
    if (agentId) {
      const agent = await this.agentRepository.findByProviderAgentIdWithUserAccess({
        providerAgentId: agentId,
        userId,
      });

      if (!agent) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `You don't have permission to use the selected ${type} agent.`,
        });
      }

      if (teamId && agent.teamId !== teamId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Selected ${type} agent does not belong to the specified team.`,
        });
      }
    }
  }

  private async handleCompensatingTransaction(
    transactionState: {
      retellPhoneNumber: RetellPhoneNumber | null;
      databaseRecordCreated: boolean;
      agentAssigned: boolean;
    },
    error: unknown,
    context: { userId: number; teamId?: number; agentId?: string }
  ) {
    if (transactionState.retellPhoneNumber?.phone_number) {
      try {
        console.warn(`Attempting cleanup of Retell phone number ${transactionState.retellPhoneNumber.phone_number} due to transaction failure`);
        await this.retellRepository.deletePhoneNumber(transactionState.retellPhoneNumber.phone_number);
        console.info(`Successfully cleaned up Retell phone number ${transactionState.retellPhoneNumber.phone_number}`);
      } catch (cleanupError) {
        const compensationFailureMessage = `CRITICAL: Failed to cleanup Retell phone number ${transactionState.retellPhoneNumber.phone_number} after transaction failure. This will cause billing leaks. Original error: ${(error as Error).message}. Cleanup error: ${(cleanupError as Error).message}`;

        console.error('🚨 BILLING LEAK ALERT 🚨', {
          phoneNumber: transactionState.retellPhoneNumber.phone_number,
          userId: context.userId,
          teamId: context.teamId,
          agentId: context.agentId,
          originalError: (error as Error).message,
          cleanupError: (cleanupError as Error).message,
          transactionState: {
            retellCreated: !!transactionState.retellPhoneNumber,
            databaseCreated: transactionState.databaseRecordCreated,
            agentAssigned: transactionState.agentAssigned
          },
          timestamp: new Date().toISOString(),
          requiresManualCleanup: true
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: compensationFailureMessage
        });
      }
    }
  }
}
