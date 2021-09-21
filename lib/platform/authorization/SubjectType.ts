/**
 * Identifies the type of subject making a request.
 */
export enum SubjectType {
  /**
   * User subjects have active sessions tied to an existing user.
   */
  User,

  /**
   * Visitor subjects do not have an active session.
   */
  Visitor,
}
