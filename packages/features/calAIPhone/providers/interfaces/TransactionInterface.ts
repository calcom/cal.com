/**
 * Abstract transaction interface that allows providers to request transactional operations
 * without being coupled to any specific database implementation
 */
export interface TransactionInterface {
  /**
   * Execute operations within a transaction
   * @param operations - A function that performs the operations within the transaction context
   * @returns Promise that resolves when the transaction completes
   */
  executeInTransaction<T>(operations: (context: TransactionContext) => Promise<T>): Promise<T>;
}

/**
 * Transaction context that provides access to transactional repository operations
 */
export interface TransactionContext {
  /**
   * Phone number repository operations within this transaction
   */
  phoneNumberRepository: TransactionalPhoneNumberRepository;
}

/**
 * Phone number repository operations that can be performed within a transaction
 */
export interface TransactionalPhoneNumberRepository {
  /**
   * Create a new phone number record within the transaction
   */
  createPhoneNumber(params: {
    phoneNumber: string;
    userId: number;
    provider: string;
    teamId?: number;
    outboundAgentId?: string | null;
    providerPhoneNumberId?: string;
    subscriptionStatus?: import("@calcom/prisma/enums").PhoneNumberSubscriptionStatus;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }): Promise<void>;
}
