import { PrismaUnitOfWork } from "@calcom/lib/server/unitOfWork";

import { TeamRepository } from "../repositories/TeamRepository";

export interface ITeamDeletionServiceDeps {
  teamRepository: TeamRepository;
}

/**
 * Service for handling team deletion with proper transaction management.
 *
 * This service demonstrates the Unit of Work pattern by coordinating
 * multiple repository operations within a single transaction.
 *
 * @example
 * ```typescript
 * const teamDeletionService = new TeamDeletionService({ teamRepository });
 * const deletedTeam = await teamDeletionService.deleteTeamWithDependencies({ teamId: 123 });
 * ```
 */
export class TeamDeletionService {
  constructor(private deps: ITeamDeletionServiceDeps) {}

  /**
   * Deletes a team and all its dependencies (managed event types and memberships)
   * within a single transaction using the Unit of Work pattern.
   *
   * If any operation fails, all changes are rolled back automatically.
   *
   * @param teamId - The ID of the team to delete
   * @returns The deleted team record
   * @throws Error if the team doesn't exist or deletion fails
   */
  async deleteTeamWithDependencies({ teamId }: { teamId: number }) {
    const unitOfWork = new PrismaUnitOfWork({
      teamRepository: (tx) => this.deps.teamRepository.withTransaction(tx),
    });

    return await unitOfWork.transaction(async ({ teamRepository }) => {
      // Delete managed event types first (foreign key constraint)
      await teamRepository.deleteManagedEventTypesByTeamId({ teamId });

      // Delete all memberships
      await teamRepository.deleteMembershipsByTeamId({ teamId });

      // Finally delete the team itself
      const deletedTeam = await teamRepository.delete({ id: teamId });

      return deletedTeam;
    });
  }
}
