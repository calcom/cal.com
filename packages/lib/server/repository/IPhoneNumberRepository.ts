import type { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

export interface AgentInfo {
  id: string;
  name: string;
  providerAgentId: string;
}

export interface PhoneNumberDto {
  id: number;
  phoneNumber: string;
  provider: string | null;
  userId: number | null;
  teamId: number | null;
  subscriptionStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  inboundAgentId?: string | null;
  outboundAgentId?: string | null;
  providerPhoneNumberId?: string | null;
}

export interface PhoneNumberWithAgentsDto extends PhoneNumberDto {
  inboundAgent: AgentInfo | null;
  outboundAgent: AgentInfo | null;
}

export interface PhoneNumberWithUserAndTeamDto {
  id: number;
  phoneNumber: string;
  userId: number | null;
  teamId: number | null;
  user: { id: number; email: string; name: string | null } | null;
  team: { id: number; name: string; parentId: number | null } | null;
}

export interface CreatePhoneNumberInput {
  phoneNumber: string;
  provider: string;
  userId: number;
  teamId?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: PhoneNumberSubscriptionStatus;
  providerPhoneNumberId?: string;
}

export interface IPhoneNumberRepository {
  findByPhoneNumberAndUserId(params: {
    phoneNumber: string;
    userId: number;
  }): Promise<PhoneNumberDto>;

  findPhoneNumbersFromUserId(params: { userId: number }): Promise<PhoneNumberWithAgentsDto[]>;

  createPhoneNumber(input: CreatePhoneNumberInput): Promise<PhoneNumberDto>;

  deletePhoneNumber(params: { phoneNumber: string }): Promise<PhoneNumberDto>;

  findByStripeSubscriptionId(params: {
    stripeSubscriptionId: string;
  }): Promise<PhoneNumberDto | null>;

  findByIdAndUserId(params: { id: number; userId: number }): Promise<PhoneNumberDto | null>;

  findByIdWithTeamAccess(params: {
    id: number;
    teamId: number;
    userId: number;
  }): Promise<PhoneNumberDto | null>;

  findByPhoneNumberAndTeamId(params: {
    phoneNumber: string;
    teamId: number;
    userId: number;
  }): Promise<PhoneNumberDto | null>;

  findManyWithUserAccess(params: {
    userId: number;
    teamId?: number;
    scope?: "personal" | "team" | "all";
  }): Promise<PhoneNumberWithAgentsDto[]>;

  updateSubscriptionStatus(params: {
    id: number;
    subscriptionStatus: PhoneNumberSubscriptionStatus;
    disconnectAgents?: boolean;
  }): Promise<PhoneNumberDto>;

  updateAgents(params: {
    id: number;
    inboundProviderAgentId?: string | null;
    outboundProviderAgentId?: string | null;
  }): Promise<PhoneNumberDto>;

  updateInboundAgentId(params: {
    id: number;
    agentId: string;
  }): Promise<{ count: number }>;

  findInboundAgentIdByPhoneNumberId(params: {
    phoneNumberId: number;
  }): Promise<{ inboundAgentId: string | null } | null>;

  findByPhoneNumber(params: {
    phoneNumber: string;
  }): Promise<PhoneNumberWithUserAndTeamDto | null>;
}
