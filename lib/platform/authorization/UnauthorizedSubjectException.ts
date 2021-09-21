/**
 * Exception thrown by an entity's policy checker when a subject cannot perform
 * a specific action.
 */
export class UnauthorizedSubjectException extends Error {
  public constructor() {
    super("The current subject is not authorized to perform the requested action on this entity.");
  }
}
