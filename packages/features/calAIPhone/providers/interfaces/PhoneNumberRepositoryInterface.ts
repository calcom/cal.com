import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

/**
 * Abstract interface for Phone Number repository operations
 * This interface defines only the operations that the provider layer needs
 * Allows for loose coupling between provider and application layers
 */
export interface PhoneNumberRepositoryInterface {
  /**
   * Find phone number by phone number and user ID
   */
  findByPhoneNumberAndUserId(params: {
    phoneNumber: string;
    userId: number;
  }): Promise<PhoneNumberData | null>;

  /**
   * Find phone number by phone number and team ID with user access validation
   */
  findByPhoneNumberAndTeamId(params: {
    phoneNumber: string;
    teamId: number;
    userId: number;
  }): Promise<PhoneNumberData | null>;

  /**
   * Find phone number by ID and user ID
   */
  findByIdAndUserId(params: { id: number; userId: number }): Promise<PhoneNumberData | null>;

  /**
   * Find phone number by ID with team access validation
   */
  findByIdWithTeamAccess(params: {
    id: number;
    teamId: number;
    userId: number;
  }): Promise<PhoneNumberData | null>;

  /**
   * Create a new phone number record
   */
  createPhoneNumber(params: {
    phoneNumber: string;
    provider?: string;
    userId: number;
    teamId?: number;
    outboundAgentId?: string | null;
  }): Promise<PhoneNumberData>;

  /**
   * Delete phone number by phone number
   */
  deletePhoneNumber(params: { phoneNumber: string }): Promise<void>;

  /**
   * Update subscription status
   */
  updateSubscriptionStatus(params: {
    id: number;
    subscriptionStatus: PhoneNumberSubscriptionStatus;
    disconnectOutboundAgent?: boolean;
  }): Promise<void>;

  /**
   * Update agents for a phone number
   */
  updateAgents(params: {
    id: number;
    inboundProviderAgentId?: string | null;
    outboundProviderAgentId?: string | null;
  }): Promise<void>;
}

/**
 * Phone Number data structure
 */
export interface PhoneNumberData {
  id: number;
  phoneNumber: string;
  userId: number | null;
  teamId: number | null;
  subscriptionStatus: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  provider: string | null;
  inboundAgentId: string | null;
  outboundAgentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
