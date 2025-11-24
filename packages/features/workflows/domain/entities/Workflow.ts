import { TeamId } from "../value-objects/TeamId";
import { UserId } from "../value-objects/UserId";
import { WorkflowId } from "../value-objects/WorkflowId";

/**
 * Workflow Entity
 *
 * Represents a workflow in the domain model.
 * Contains the essential properties needed for permission checking.
 */
export class Workflow {
  private readonly _id: WorkflowId;
  private readonly _userId: UserId | null;
  private readonly _teamId: TeamId | null;

  constructor(id: WorkflowId, userId: UserId | null, teamId: TeamId | null) {
    this._id = id;
    this._userId = userId;
    this._teamId = teamId;

    // Business rule: A workflow must belong to either a user or a team, but not both
    if (userId && teamId) {
      throw new Error("A workflow cannot belong to both a user and a team");
    }
    if (!userId && !teamId) {
      throw new Error("A workflow must belong to either a user or a team");
    }
  }

  get id(): WorkflowId {
    return this._id;
  }

  get userId(): UserId | null {
    return this._userId;
  }

  get teamId(): TeamId | null {
    return this._teamId;
  }

  /**
   * Check if this is a personal workflow (belongs to a user)
   */
  isPersonal(): boolean {
    return this._userId !== null && this._teamId === null;
  }

  /**
   * Check if this is a team workflow
   */
  isTeamWorkflow(): boolean {
    return this._teamId !== null && this._userId === null;
  }

  /**
   * Check if the given user is the owner of this workflow
   */
  isOwnedBy(userId: UserId): boolean {
    return this._userId !== null && this._userId.equals(userId);
  }

  /**
   * Check if this workflow belongs to the given team
   */
  belongsToTeam(teamId: TeamId): boolean {
    return this._teamId !== null && this._teamId.equals(teamId);
  }

  /**
   * Create a Workflow from primitive values
   */
  static fromPrimitives(id: number, userId: number | null, teamId: number | null): Workflow {
    return new Workflow(
      WorkflowId.fromNumber(id),
      userId ? UserId.fromNumber(userId) : null,
      teamId ? TeamId.fromNumber(teamId) : null
    );
  }

  /**
   * Create a Workflow from a database record-like object
   */
  static fromRecord(record: { id: number; userId: number | null; teamId: number | null }): Workflow {
    return Workflow.fromPrimitives(record.id, record.userId, record.teamId);
  }

  /**
   * Convert to primitive values for database operations
   */
  toPrimitives(): { id: number; userId: number | null; teamId: number | null } {
    return {
      id: this._id.toNumber(),
      userId: this._userId?.toNumber() ?? null,
      teamId: this._teamId?.toNumber() ?? null,
    };
  }

  /**
   * Check equality with another Workflow
   */
  equals(other: Workflow): boolean {
    return this._id.equals(other._id);
  }

  toString(): string {
    const owner = this._userId ? `user:${this._userId.toString()}` : `team:${this._teamId?.toString()}`;
    return `Workflow(id=${this._id.toString()}, owner=${owner})`;
  }
}
