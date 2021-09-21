export interface PasswordAuthenticator {
  /**
   * Generates a hashed password from the provided plaintext.
   *
   * @param {string} plaintext - Plaintext password
   */
  generate(plaintext: string): Promise<string>;

  /**
   * Compares a hashed password with its possible plaintext equivalent.
   *
   * @param {string} plaintext - Plaintext password
   * @param {string} hash - Existing hashed password
   */
  compare(plaintext: string, hash: string): Promise<boolean>;

  /**
   * Determines if the plaintext password for an existing hashed password must
   * be upgraded because the implementation's cost factor(s) have changed.
   *
   * @param {string} hash - Existing hashed password
   */
  isUpgradeRequired(hash: string): boolean;
}
