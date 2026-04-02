import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";
import type {
  AIPhoneServiceCreatePhoneNumberParams,
  AIPhoneServiceImportPhoneNumberParamsExtended,
  AIPhoneServicePhoneNumber,
} from "../../../interfaces/AIPhoneService.interface";
import { AIPhoneServiceProviderType } from "../../../interfaces/AIPhoneService.interface";
import type { AgentRepositoryInterface } from "../../interfaces/AgentRepositoryInterface";
import type { PhoneNumberRepositoryInterface } from "../../interfaces/PhoneNumberRepositoryInterface";
import type { TransactionInterface } from "../../interfaces/TransactionInterface";
import { RetellAIServiceMapper } from "../RetellAIServiceMapper";
import type { RetellAIRepository } from "../types";

type Dependencies = {
  retellRepository: RetellAIRepository;
  agentRepository: AgentRepositoryInterface;
  phoneNumberRepository: PhoneNumberRepositoryInterface;
  transactionManager: TransactionInterface;
};

export class PhoneNumberService {
  private logger = logger.getSubLogger({ prefix: ["PhoneNumberService"] });
  constructor(private deps: Dependencies) {}

  async importPhoneNumber(
    data: AIPhoneServiceImportPhoneNumberParamsExtended
  ): Promise<AIPhoneServicePhoneNumber<AIPhoneServiceProviderType.RETELL_AI>> {
    if (!data || !data.phone_number?.trim()) {
      throw new HttpError({
        statusCode: 400,
        message: "Phone number is required and cannot be empty",
      });
    }

    const { userId, agentId, teamId, ...rest } = data;

    await this.validateTeamPermissions(userId, teamId);
    const agent = await this.validateAgentPermissions(userId, agentId);

    const transactionState = {
      retellPhoneNumber: null as AIPhoneServicePhoneNumber<AIPhoneServiceProviderType.RETELL_AI> | null,
      databaseRecordCreated: false,
      agentAssigned: false,
    };

    try {
      return await this.deps.transactionManager.executeInTransaction(async (txContext) => {
        transactionState.retellPhoneNumber = await this.deps.retellRepository.importPhoneNumber({
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
          await this.deps.retellRepository.updatePhoneNumber(
            transactionState.retellPhoneNumber.phone_number,
            {
              outbound_agent_id: agent.providerAgentId,
            }
          );
          transactionState.agentAssigned = true;
        }

        return transactionState.retellPhoneNumber;
      });
    } catch (error) {
      await this.handleCompensatingTransaction(transactionState, error, { userId, teamId, agentId });
      throw error;
    }
  }

  async createPhoneNumber(
    data: AIPhoneServiceCreatePhoneNumberParams
  ): Promise<AIPhoneServicePhoneNumber<AIPhoneServiceProviderType.RETELL_AI> & { provider: string }> {
    try {
      const phoneNumber = await this.deps.retellRepository.createPhoneNumber(data);
      return {
        ...phoneNumber,
        provider: AIPhoneServiceProviderType.RETELL_AI,
      };
    } catch (error) {
      this.logger.error("Failed to create phone number in external AI service", {
        data,
        error,
      });
      throw new HttpError({
        statusCode: 500,
        message: "Failed to create phone number",
      });
    }
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
    if (!phoneNumber?.trim()) {
      throw new HttpError({
        statusCode: 400,
        message: "Phone number is required and cannot be empty",
      });
    }

    const phoneNumberToDelete = teamId
      ? await this.deps.phoneNumberRepository.findByPhoneNumberAndTeamId({
          phoneNumber,
          teamId,
          userId,
        })
      : await this.deps.phoneNumberRepository.findByPhoneNumberAndUserId({
          phoneNumber,
          userId,
        });

    if (!phoneNumberToDelete) {
      throw new HttpError({
        statusCode: 404,
        message: "Phone number not found or you don't have permission to delete it.",
      });
    }

    if (phoneNumberToDelete.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE) {
      throw new HttpError({
        statusCode: 400,
        message: "Phone number is still active",
      });
    }
    if (phoneNumberToDelete.subscriptionStatus === PhoneNumberSubscriptionStatus.CANCELLED) {
      throw new HttpError({
        statusCode: 400,
        message: "Phone number is already cancelled",
      });
    }

    try {
      await this.deps.retellRepository.updatePhoneNumber(phoneNumber, {
        inbound_agent_id: null,
        outbound_agent_id: null,
      });
    } catch (error) {
      this.logger.error("Failed to remove agents from phone number in Retell", {
        phoneNumber,
        error,
      });
    }

    await this.deps.retellRepository.deletePhoneNumber(phoneNumber);

    if (deleteFromDB) {
      await this.deps.phoneNumberRepository.deletePhoneNumber({ phoneNumber });
    }
  }

  async getPhoneNumber(
    phoneNumber: string
  ): Promise<AIPhoneServicePhoneNumber<AIPhoneServiceProviderType.RETELL_AI>> {
    if (!phoneNumber?.trim()) {
      throw new HttpError({
        statusCode: 400,
        message: "Phone number is required and cannot be empty",
      });
    }

    try {
      return await this.deps.retellRepository.getPhoneNumber(phoneNumber);
    } catch (error) {
      this.logger.error("Failed to get phone number from external AI service", {
        phoneNumber,
        error,
      });
      throw new HttpError({
        statusCode: 500,
        message: `Failed to get phone number '${phoneNumber}'`,
      });
    }
  }

  async updatePhoneNumber(
    phoneNumber: string,
    data: { inbound_agent_id?: string | null; outbound_agent_id?: string | null }
  ): Promise<AIPhoneServicePhoneNumber<AIPhoneServiceProviderType.RETELL_AI>> {
    if (!phoneNumber?.trim()) {
      throw new HttpError({
        statusCode: 400,
        message: "Phone number is required and cannot be empty",
      });
    }

    if (!data || Object.keys(data).length === 0) {
      throw new HttpError({
        statusCode: 400,
        message: "Update data is required and cannot be empty",
      });
    }

    try {
      return await this.deps.retellRepository.updatePhoneNumber(phoneNumber, data);
    } catch (error) {
      this.logger.error("Failed to update phone number in external AI service", {
        phoneNumber,
        data,
        error,
      });
      throw new HttpError({
        statusCode: 500,
        message: `Failed to update phone number '${phoneNumber}'`,
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
    if (!phoneNumber?.trim()) {
      throw new HttpError({
        statusCode: 400,
        message: "Phone number is required and cannot be empty",
      });
    }

    const phoneNumberRecord = teamId
      ? await this.deps.phoneNumberRepository.findByPhoneNumberAndTeamId({
          phoneNumber,
          teamId,
          userId,
        })
      : await this.deps.phoneNumberRepository.findByPhoneNumberAndUserId({
          phoneNumber,
          userId,
        });

    if (!phoneNumberRecord) {
      throw new HttpError({
        statusCode: 404,
        message: "Phone number not found or you don't have permission to update it.",
      });
    }

    await this.validateAgentAccess(userId, teamId, inboundAgentId, "inbound");
    await this.validateAgentAccess(userId, teamId, outboundAgentId, "outbound");

    try {
      await this.getPhoneNumber(phoneNumber);

      const retellUpdateData = RetellAIServiceMapper.mapPhoneNumberUpdateData(
        inboundAgentId,
        outboundAgentId
      );

      if (Object.keys(retellUpdateData).length > 0) {
        await this.updatePhoneNumber(phoneNumber, retellUpdateData);
      }
    } catch (error: unknown) {
      this.logger.error("Failed to update phone number in external AI service", {
        phoneNumber,
        error,
        note: "Continuing with local database update only",
      });
    }

    await this.deps.phoneNumberRepository.updateAgents({
      id: phoneNumberRecord.id,
      inboundProviderAgentId: inboundAgentId,
      outboundProviderAgentId: outboundAgentId,
    });

    return { message: "Phone number updated successfully" };
  }

  private async validateTeamPermissions(userId: number, teamId?: number) {
    if (teamId) {
      const canManage = await this.deps.agentRepository.canManageTeamResources({
        userId,
        teamId,
      });
      if (!canManage) {
        throw new HttpError({
          statusCode: 403,
          message: "You don't have permission to import phone numbers for this team.",
        });
      }
    }
  }

  private async validateAgentPermissions(userId: number, agentId?: string | null) {
    if (!agentId) {
      throw new HttpError({
        statusCode: 400,
        message: "Agent ID is required and cannot be empty",
      });
    }

    let agent = null;
    if (agentId) {
      agent = await this.deps.agentRepository.findByIdWithUserAccess({
        agentId,
        userId,
      });

      if (!agent) {
        throw new HttpError({
          statusCode: 403,
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
      const agent = await this.deps.agentRepository.findByProviderAgentIdWithUserAccess({
        providerAgentId: agentId,
        userId,
      });

      if (!agent) {
        throw new HttpError({
          statusCode: 403,
          message: `You don't have permission to use the selected ${type} agent.`,
        });
      }

      if (teamId && agent.teamId !== teamId) {
        throw new HttpError({
          statusCode: 403,
          message: `Selected ${type} agent does not belong to the specified team.`,
        });
      }
    }
  }

  private async handleCompensatingTransaction(
    transactionState: {
      retellPhoneNumber: AIPhoneServicePhoneNumber<AIPhoneServiceProviderType.RETELL_AI> | null;
      databaseRecordCreated: boolean;
      agentAssigned: boolean;
    },
    error: unknown,
    context: { userId: number; teamId?: number; agentId?: string | null | undefined }
  ) {
    if (transactionState.retellPhoneNumber?.phone_number) {
      try {
        this.logger.warn("Attempting cleanup of Retell phone number due to transaction failure", {
          phoneNumber: transactionState.retellPhoneNumber.phone_number,
        });
        await this.deps.retellRepository.deletePhoneNumber(transactionState.retellPhoneNumber.phone_number);
        this.logger.info("Successfully cleaned up Retell phone number", {
          phoneNumber: transactionState.retellPhoneNumber.phone_number,
        });
      } catch (cleanupError) {
        const compensationFailureMessage = `Failed to cleanup Retell phone number ${transactionState.retellPhoneNumber.phone_number} after transaction failure. Manual cleanup required.`;

        this.logger.error(compensationFailureMessage, {
          phoneNumber: transactionState.retellPhoneNumber.phone_number,
          userId: context.userId,
          teamId: context.teamId,
          agentId: context.agentId,
          originalError: error,
          cleanupError: cleanupError,
          transactionState: {
            retellCreated: !!transactionState.retellPhoneNumber,
            databaseCreated: transactionState.databaseRecordCreated,
            agentAssigned: transactionState.agentAssigned,
          },
          requiresManualCleanup: true,
        });

        throw new HttpError({
          statusCode: 500,
          message: compensationFailureMessage,
        });
      }
    }
  }
}
