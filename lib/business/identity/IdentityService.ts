/* eslint-disable max-params */

import { UserRepository } from "./internal/repositories/UserRepository";
import { UserPolicyChecker } from "./internal/UserPolicyChecker";
import { Subject } from "../../platform/authorization/Subject";
import { UnauthorizedSubjectException } from "../../platform/authorization/UnauthorizedSubjectException";
import { PasswordAuthenticator } from "./internal/PasswordAuthenticator";
import { UserRecord } from "./internal/repositories/UserRecord";
import { IdentityServiceException } from "./IdentityServiceException";
import { IdentityServiceErrorCode } from "./IdentityServiceErrorCode";

export class IdentityService {
  public static readonly PASSWORD_POLICY = {
    MIN_LENGTH: 8,
    MAX_LENGTH: 72,
  } as const;

  private readonly passwordAuthenticator: PasswordAuthenticator;

  private readonly policyChecker: UserPolicyChecker;

  private readonly userRepository: UserRepository;

  public constructor(
    passwordAuthenticator: PasswordAuthenticator,
    userPolicyChecker: UserPolicyChecker,
    userRepository: UserRepository
  ) {
    this.passwordAuthenticator = passwordAuthenticator;
    this.policyChecker = userPolicyChecker;
    this.userRepository = userRepository;
  }

  /**
   * Change the password for a given user.
   *
   * @param {Subject} subject - Resolved subject
   * @param {number} id - User id
   * @param {string} current - Current password
   * @param {string} updated - New password
   */
  public async changePassword(subject: Subject, id: number, current: string, updated: string): Promise<void> {
    if (!this.policyChecker.canChangePassword(subject, id)) {
      throw new UnauthorizedSubjectException();
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new IdentityServiceException(IdentityServiceErrorCode.UserNotFound);
    }

    const isCorrectPassword = await this.validatePassword(current, user);
    if (!isCorrectPassword) {
      throw new IdentityServiceException(IdentityServiceErrorCode.IncorrectPassword);
    }

    if (updated === current) {
      throw new IdentityServiceException(IdentityServiceErrorCode.NewPasswordMatchesOld);
    }

    const hash = await this.enforcePasswordSecurityAndHash(updated);
    await this.userRepository.updatePasswordById(user.id, hash);
  }

  private async validatePassword(plaintext: string, user: UserRecord): Promise<boolean> {
    if (!plaintext.trim().length) {
      return false;
    }

    if (!user.password) {
      throw new IdentityServiceException(IdentityServiceErrorCode.PasswordMissing);
    }

    const isCorrectPassword = await this.passwordAuthenticator.compare(plaintext, user.password);
    if (isCorrectPassword) {
      await this.upgradeHashIfRequired(plaintext, user);
      return true;
    }
    return false;
  }

  private async enforcePasswordSecurityAndHash(password: string): Promise<string> {
    this.enforceComplexityRules(password);
    return this.passwordAuthenticator.generate(password);
  }

  private enforceComplexityRules(password: string): void {
    if (!password.trim().length) {
      throw new IdentityServiceException(IdentityServiceErrorCode.PasswordBlank);
    }
    if (password.length < IdentityService.PASSWORD_POLICY.MIN_LENGTH) {
      throw new IdentityServiceException(IdentityServiceErrorCode.PasswordTooShort);
    }
    if (password.length > IdentityService.PASSWORD_POLICY.MAX_LENGTH) {
      throw new IdentityServiceException(IdentityServiceErrorCode.PasswordTooLong);
    }
  }

  private async upgradeHashIfRequired(plaintext: string, user: UserRecord): Promise<void> {
    if (!user.password) {
      throw new IdentityServiceException(IdentityServiceErrorCode.PasswordMissing);
    }
    if (this.passwordAuthenticator.isUpgradeRequired(user.password)) {
      const upgradedHash = await this.passwordAuthenticator.generate(plaintext);
      await this.userRepository.updatePasswordById(user.id, upgradedHash);
    }
  }
}
