import { prisma } from "@calcom/prisma";

import type {
  ITransactionalRepository,
  RepositoryFactories,
  TransactionClient,
  UnitOfWork,
} from "./types";

/**
 * Prisma implementation of the Unit of Work pattern.
 *
 * This class wraps Prisma's $transaction method and provides a clean interface
 * for executing multiple repository operations within a single transaction.
 *
 * @template TRepositories - A record mapping repository names to their types
 *
 * @example
 * ```typescript
 * const uow = new PrismaUnitOfWork({
 *   teamRepository: (tx) => new TeamRepository(tx),
 *   membershipRepository: (tx) => new MembershipRepository(tx),
 * });
 *
 * await uow.transaction(async ({ teamRepository, membershipRepository }) => {
 *   await membershipRepository.deleteByTeamId(teamId);
 *   await teamRepository.delete(teamId);
 *   // If any operation fails, all changes are rolled back
 * });
 * ```
 */
export class PrismaUnitOfWork<TRepositories extends Record<string, ITransactionalRepository>>
  implements UnitOfWork<TRepositories>
{
  constructor(private readonly repositoryFactories: RepositoryFactories<TRepositories>) {}

  /**
   * Executes the given function within a Prisma transaction.
   *
   * Creates transactional instances of all registered repositories and passes them
   * to the callback function. All database operations performed through these
   * repositories will be part of the same transaction.
   *
   * @param fn - The function to execute within the transaction
   * @returns The result of the function
   * @throws Re-throws any error from the function after Prisma rolls back the transaction
   */
  async transaction<T>(fn: (repositories: TRepositories) => Promise<T>): Promise<T> {
    return await prisma.$transaction(async (tx) => {
      // Create transactional repository instances
      const transactionalRepositories = {} as TRepositories;

      for (const key in this.repositoryFactories) {
        const factory = this.repositoryFactories[key];
        transactionalRepositories[key] = factory(tx as TransactionClient);
      }

      // Execute the callback with transactional repositories
      return await fn(transactionalRepositories);
    });
  }
}
