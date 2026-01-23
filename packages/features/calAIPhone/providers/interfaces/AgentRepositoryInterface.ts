/**
 * Abstract interface for Agent repository operations
 * This interface defines only the operations that the provider layer needs
 * Allows for loose coupling between provider and application layers
 */
export interface AgentRepositoryInterface {
  /**
   * Check if user can manage team resources
   */
  canManageTeamResources(params: { userId: number; teamId: number }): Promise<boolean>;

  /**
   * Find agent by ID with user access validation
   */
  findByIdWithUserAccess(params: { agentId: string; userId: number }): Promise<AgentData | null>;

  /**
   * Find agent by provider agent ID with user access validation
   */
  findByProviderAgentIdWithUserAccess(params: {
    providerAgentId: string;
    userId: number;
  }): Promise<AgentData | null>;

  /**
   * Find many agents with user access validation
   */
  findManyWithUserAccess(params: {
    userId: number;
    teamId?: number;
    scope?: "personal" | "team" | "all";
  }): Promise<AgentWithDetailsData[]>;

  /**
   * Find agent by ID with user access and additional details
   */
  findByIdWithUserAccessAndDetails(params: {
    id: string;
    userId: number;
    teamId?: number;
  }): Promise<AgentWithDetailsData | null>;

  /**
   * Create a new agent
   */
  create(params: {
    name: string;
    providerAgentId: string;
    userId: number;
    teamId?: number;
  }): Promise<AgentData>;

  /**
   * Find agent by ID with admin access validation
   */
  findByIdWithAdminAccess(params: { id: string; userId: number; teamId?: number }): Promise<AgentData | null>;

  /**
   * Find agent by ID with call access validation
   */
  findByIdWithCallAccess(params: { id: string; userId: number }): Promise<AgentWithPhoneNumbersData | null>;

  /**
   * Delete agent by ID
   */
  delete(params: { id: string }): Promise<void>;

  /**
   * Link agent to workflow step
   */
  linkOutboundAgentToWorkflow(params: { workflowStepId: number; agentId: string }): Promise<void>;

  /**
   * Link inbound agent to workflow
   */
  linkInboundAgentToWorkflow(params: { workflowStepId: number; agentId: string }): Promise<void>;

  /**
   * Update outbound event type ID for an agent
   */
  updateOutboundEventTypeId(params: { agentId: string; eventTypeId: number }): Promise<void>;
}

/**
 * Basic agent data structure
 */
export interface AgentData {
  id: string;
  name: string;
  providerAgentId: string;
  enabled: boolean;
  userId: number | null;
  teamId: number | null;
  inboundEventTypeId?: number | null;
  outboundEventTypeId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agent data with additional details
 */
export interface AgentWithDetailsData extends AgentData {
  user: {
    id: number;
    name: string | null;
    email: string | null;
  } | null;
  team: {
    id: number;
    name: string | null;
    slug: string | null;
    logoUrl?: string | null;
  } | null;
  outboundPhoneNumbers: Array<{
    id: number;
    phoneNumber: string;
    subscriptionStatus: string | null;
    provider: string | null;
  }>;
}

/**
 * Agent data with phone numbers for call operations
 */
export interface AgentWithPhoneNumbersData extends AgentData {
  outboundPhoneNumbers: Array<{
    phoneNumber: string;
  }>;
}
