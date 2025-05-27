// Pure/shared entity permission utilities for use in both client and server environments

/**
 * It returns true if the two entities are created for the same team or same user.
 */
export const areTheySiblingEntities = ({
  entity1,
  entity2,
}: {
  entity1: { teamId: number | null; userId: number | null };
  entity2: { teamId: number | null; userId: number | null };
}) => {
  if (entity1.teamId) {
    return entity1.teamId === entity2.teamId;
  }
  // If entity doesn't belong to a team, then target shouldn't be a team.
  // Also check for `userId` now.
  return !entity2.teamId && entity1.userId === entity2.userId;
};
