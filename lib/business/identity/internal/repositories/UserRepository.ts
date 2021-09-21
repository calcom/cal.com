import { UserRecord } from "./UserRecord";

export interface UserRepository {
  /**
   * Find a user by their id.
   *
   * @param {number} id - User id
   */
  findById(id: number): Promise<UserRecord | null>;

  /**
   * Updates password for a user.
   *
   * @param {number} id - User id
   * @param {string} hash - New password hash
   */
  updatePasswordById(id: number, hash: string): Promise<void>;
}
