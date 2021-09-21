import { Subject } from "@lib/platform/authorization/Subject";
import { SubjectType } from "@lib/platform/authorization/SubjectType";

export class UserPolicyChecker {
  /**
   * Enforce that only users can change their own passwords.
   *
   * @param {Subject} subject - Resolved subject
   * @param {number} id - User id
   */
  public canChangePassword(subject: Subject, id: number): boolean {
    if (subject.type === SubjectType.User) {
      return subject.user.id === id;
    }
    return false;
  }
}
