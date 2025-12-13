export interface AgentDto {
  id: string;
  name: string;
  providerAgentId: string;
  enabled: boolean;
  userId: number;
  teamId: number | null;
  inboundEventTypeId?: number | null;
  outboundEventTypeId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentWithTeamDto extends AgentDto {
  team?: {
    id: number;
    parentId: number | null;
  } | null;
}

export interface AgentUserInfo {
  id: number;
  name: string | null;
  email: string | null;
}

export interface AgentTeamInfo {
  id: number;
  name: string | null;
  slug: string | null;
  logoUrl?: string | null;
}

export interface PhoneNumberInfo {
  id: number;
  phoneNumber: string;
  subscriptionStatus: string;
  provider: string;
}

export interface AgentWithDetailsDto extends AgentDto {
  user: AgentUserInfo | null;
  team: AgentTeamInfo | null;
  outboundPhoneNumbers: PhoneNumberInfo[];
}

export interface AgentWithCallAccessDto extends AgentDto {
  outboundPhoneNumbers: { phoneNumber: string }[];
}

export interface AgentWithPhoneNumbersDto {
  id: string;
  outboundPhoneNumbers: {
    id: number;
    phoneNumber: string;
    subscriptionStatus: string | null;
  }[];
}

export interface CreateAgentInput {
  name: string;
  providerAgentId: string;
  userId: number;
  teamId?: number;
}

export interface IAgentRepository {
  findByIdWithUserAccess(params: {
    agentId: string;
    userId: number;
    teamId?: number;
  }): Promise<AgentDto | null>;

  findByProviderAgentIdWithUserAccess(params: {
    providerAgentId: string;
    userId: number;
  }): Promise<AgentDto | null>;

  findById(params: { id: string }): Promise<AgentDto | null>;

  findByProviderAgentId(params: { providerAgentId: string }): Promise<AgentWithTeamDto | null>;

  findManyWithUserAccess(params: {
    userId: number;
    teamId?: number;
    scope?: "personal" | "team" | "all";
  }): Promise<AgentWithDetailsDto[]>;

  findByIdWithUserAccessAndDetails(params: {
    id: string;
    userId: number;
    teamId?: number;
  }): Promise<AgentWithDetailsDto | null>;

  create(input: CreateAgentInput): Promise<AgentDto>;

  findByIdWithAdminAccess(params: {
    id: string;
    userId: number;
    teamId?: number;
  }): Promise<AgentDto | null>;

  findByIdWithCallAccess(params: {
    id: string;
    userId: number;
  }): Promise<AgentWithCallAccessDto | null>;

  delete(params: { id: string }): Promise<AgentDto>;

  linkOutboundAgentToWorkflow(params: {
    workflowStepId: number;
    agentId: string;
  }): Promise<{ id: number; agentId: string | null }>;

  linkInboundAgentToWorkflow(params: {
    workflowStepId: number;
    agentId: string;
  }): Promise<{ id: number; inboundAgentId: string | null }>;

  updateEventTypeId(params: {
    agentId: string;
    eventTypeId: number;
  }): Promise<AgentDto>;

  updateOutboundEventTypeId(params: {
    agentId: string;
    eventTypeId: number;
  }): Promise<AgentDto>;

  canManageTeamResources(params: {
    userId: number;
    teamId: number;
  }): Promise<boolean>;

  findAgentWithPhoneNumbers(agentId: string): Promise<AgentWithPhoneNumbersDto | null>;

  findProviderAgentIdById(agentId: string): Promise<{ providerAgentId: string } | null>;
}
