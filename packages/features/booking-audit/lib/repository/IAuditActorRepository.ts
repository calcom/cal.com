import type { AuditActor } from "@calcom/prisma/client";

export interface IAuditActorRepository {
  /**
   * Find an actor by user ID
   */
  findByUserId(userId: number): Promise<AuditActor | null>;

  /**
   * Create or update an actor for a user
   */
  upsertUserActor(userId: number): Promise<AuditActor>;

  /**
   * Get the system actor (always returns the predefined system actor)
   */
  getSystemActor(): Promise<AuditActor>;
}

