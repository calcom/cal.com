import type { PrismaTransaction } from "@calcom/prisma";

/**
 * Transaction client type - a Prisma client without transaction-related methods.
 * This is the client that gets passed to repositories within a transaction.
 */
export type TransactionClient = PrismaTransaction;

/**
 * Base interface for repositories that support transactional operations.
 * Repositories implementing this interface can be used within a Unit of Work.
 */
export interface ITransactionalRepository {
  /**
   * Creates a new instance of the repository bound to the given transaction client.
   * This method should return a new instance (clone pattern) rather than mutating the current instance.
   *
   * @param tx - The transaction client to bind to
   * @returns A new repository instance bound to the transaction
   */
  withTransaction(tx: TransactionClient): this;
}

/**
 * Type for a repository factory function.
 * Takes a transaction client and returns a repository instance bound to that client.
 */
export type RepositoryFactory<T extends ITransactionalRepository> = (tx: TransactionClient) => T;

/**
 * Maps repository names to their factory functions.
 */
export type RepositoryFactories<TRepositories extends Record<string, ITransactionalRepository>> = {
  [K in keyof TRepositories]: RepositoryFactory<TRepositories[K]>;
};

/**
 * Unit of Work interface.
 * Provides a way to execute multiple repository operations within a single transaction.
 *
 * @template TRepositories - A record of repository names to their types
 *
 * @example
 * ```typescript
 * const uow: UnitOfWork<{
 *   teamRepository: TeamRepository;
 *   membershipRepository: MembershipRepository;
 * }> = getUnitOfWork();
 *
 * await uow.transaction(async ({ teamRepository, membershipRepository }) => {
 *   await membershipRepository.deleteByTeamId(teamId);
 *   await teamRepository.delete(teamId);
 * });
 * ```
 */
export interface UnitOfWork<TRepositories extends Record<string, ITransactionalRepository>> {
  /**
   * Executes the given function within a database transaction.
   * All repository operations performed within the callback will be part of the same transaction.
   * If any operation fails, all changes will be rolled back.
   *
   * @param fn - The function to execute within the transaction. Receives transactional repository instances.
   * @returns The result of the function
   * @throws Re-throws any error from the function after rolling back the transaction
   */
  transaction<T>(fn: (repositories: TRepositories) => Promise<T>): Promise<T>;
}
