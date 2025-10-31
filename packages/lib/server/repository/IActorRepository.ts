import type { Actor } from "@calcom/prisma/client";

export interface IActorRepository {
  /**
   * Find an actor by user ID
   */
  findByUserId(userId: number): Promise<Actor | null>;

  /**
   * Create or update an actor for a user
   */
  upsertUserActor(userId: number): Promise<Actor>;

  /**
   * Get the system actor (always returns the predefined system actor)
   */
  getSystemActor(): Promise<Actor>;
}

