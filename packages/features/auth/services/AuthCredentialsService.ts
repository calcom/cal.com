import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { isPasswordValid } from "@calcom/lib/auth/isPasswordValid";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { symmetricDecrypt, symmetricEncrypt } from "@calcom/lib/crypto";
import { isENVDev } from "@calcom/lib/env";
import type { AppLogger } from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { PrismaClient } from "@calcom/prisma";
import type { Membership, Team } from "@calcom/prisma/client";
import { IdentityProvider, UserPermissionRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { User } from "next-auth";
import { ErrorCode } from "../lib/ErrorCode";

type UserWithProfiles = NonNullable<
  Awaited<ReturnType<UserRepository["findByEmailAndIncludeProfilesAndPassword"]>>
>;

type UserTeams = {
  teams: (Membership & {
    team: Pick<Team, "metadata">;
  })[];
};

export interface IAuthCredentialsServiceDeps {
  userRepository: Pick<UserRepository, "findByEmailAndIncludeProfilesAndPassword">;
  checkRateLimitAndThrowError: (opts: { identifier: string }) => Promise<void>;
  hashEmail: (email: string) => string;
  verifyPassword: (password: string, hash: string) => Promise<boolean>;
  prisma: PrismaClient;
  log: Pick<AppLogger, "debug" | "warn" | "error" | "info">;
}

export class AuthCredentialsService {
  constructor(private readonly deps: IAuthCredentialsServiceDeps) {}

  async authorize(
    credentials: Record<"email" | "password" | "totpCode" | "backupCode", string> | undefined
  ): Promise<User | null> {
    this.deps.log.debug("credentials:authorize", safeStringify({ credentials }));

    if (!credentials) {
      this.deps.log.error("auth:credentials:denied", { reason: "missing_credentials" });
      throw new Error(ErrorCode.InternalServerError);
    }

    const user = await this.deps.userRepository.findByEmailAndIncludeProfilesAndPassword({
      email: credentials.email,
    });
    if (!user) {
      throw new Error(ErrorCode.IncorrectEmailPassword);
    }

    if (user.locked) {
      this.deps.log.warn("auth:credentials:denied", { reason: "account_locked", userId: user.id });
      throw new Error(ErrorCode.UserAccountLocked);
    }

    await this.deps.checkRateLimitAndThrowError({
      identifier: this.deps.hashEmail(user.email),
    });

    if (!user.password?.hash) {
      throw new Error(ErrorCode.IncorrectEmailPassword);
    }

    const isCorrectPassword = await this.deps.verifyPassword(credentials.password, user.password.hash);
    if (!isCorrectPassword) {
      throw new Error(ErrorCode.IncorrectEmailPassword);
    }

    await this.verify2FA(user, credentials);

    const hasActiveTeams = this.checkIfUserBelongsToActiveTeam(user);
    const role = this.validateAdminRole(user, credentials.password);

    return this.toNextAuthUser(user, role, hasActiveTeams, credentials.password);
  }

  private async verify2FA(
    user: UserWithProfiles,
    credentials: Record<"totpCode" | "backupCode", string>
  ): Promise<void> {
    if (!user.twoFactorEnabled) return;

    // Backup codes are a recovery mechanism -- if one is provided, we accept it
    // instead of TOTP. The UI only sends one or the other, never both.
    if (credentials.backupCode) {
      await this.verifyBackupCode(user, credentials.backupCode);
    } else {
      await this.verifyTotpCode(user, credentials.totpCode);
    }
  }

  private async verifyBackupCode(user: UserWithProfiles, backupCode: string): Promise<void> {
    if (!process.env.CALENDSO_ENCRYPTION_KEY) {
      this.deps.log.error("auth:2fa:denied", { reason: "missing_encryption_key", userId: user.id });
      throw new Error(ErrorCode.InternalServerError);
    }

    if (!user.backupCodes) throw new Error(ErrorCode.MissingBackupCodes);

    const backupCodes = JSON.parse(symmetricDecrypt(user.backupCodes, process.env.CALENDSO_ENCRYPTION_KEY));

    const index = backupCodes.indexOf(backupCode.replaceAll("-", ""));
    if (index === -1) throw new Error(ErrorCode.IncorrectBackupCode);

    backupCodes[index] = null;

    await this.deps.prisma.user.update({
      where: { id: user.id },
      data: {
        backupCodes: symmetricEncrypt(JSON.stringify(backupCodes), process.env.CALENDSO_ENCRYPTION_KEY),
      },
    });
  }

  private async verifyTotpCode(user: UserWithProfiles, totpCode: string): Promise<void> {
    if (!totpCode) {
      throw new Error(ErrorCode.SecondFactorRequired);
    }

    if (!user.twoFactorSecret) {
      this.deps.log.error("auth:2fa:denied", {
        reason: "missing_totp_secret",
        userId: user.id,
      });
      throw new Error(ErrorCode.InternalServerError);
    }

    if (!process.env.CALENDSO_ENCRYPTION_KEY) {
      this.deps.log.error("auth:2fa:denied", { reason: "missing_encryption_key" });
      throw new Error(ErrorCode.InternalServerError);
    }

    const secret = symmetricDecrypt(user.twoFactorSecret, process.env.CALENDSO_ENCRYPTION_KEY);
    if (secret.length !== 32) {
      this.deps.log.error("auth:2fa:denied", {
        reason: "decryption_failed",
        expectedLength: 32,
        actualLength: secret.length,
      });
      throw new Error(ErrorCode.InternalServerError);
    }

    const { totpAuthenticatorCheck } = await import("@calcom/lib/totp");
    const isValidToken = totpAuthenticatorCheck(totpCode, secret);
    if (!isValidToken) {
      throw new Error(ErrorCode.IncorrectTwoFactorCode);
    }
  }

  private checkIfUserBelongsToActiveTeam<T extends UserTeams>(user: T): boolean {
    return user.teams.some((m: { team: { metadata: unknown } }) => {
      if (!IS_TEAM_BILLING_ENABLED) return true;
      const metadata = teamMetadataSchema.safeParse(m.team.metadata);
      return metadata.success && metadata.data?.subscriptionId;
    });
  }

  private validateAdminRole(user: UserWithProfiles, password: string): UserPermissionRole | "INACTIVE_ADMIN" {
    if (user.role !== UserPermissionRole.ADMIN) return user.role;
    if (user.identityProvider !== IdentityProvider.CAL) return user.role;
    if (process.env.NEXT_PUBLIC_IS_E2E) return user.role;
    if (isPasswordValid(password, false, true) && user.twoFactorEnabled) return user.role;
    if (isENVDev) return user.role;
    return "INACTIVE_ADMIN";
  }

  private toNextAuthUser(
    user: UserWithProfiles,
    role: UserPermissionRole | "INACTIVE_ADMIN",
    hasActiveTeams: boolean,
    password: string
  ): User {
    const baseUser = {
      ...user,
      role: role as UserPermissionRole,
      belongsToActiveTeam: hasActiveTeams,
      profile: user.allProfiles[0],
    } as User;

    if (role === "INACTIVE_ADMIN") {
      const passwordValid = isPasswordValid(password, false, true);
      const has2FA = user.twoFactorEnabled;

      let reason: "both" | "password" | "2fa";
      if (!passwordValid && !has2FA) {
        reason = "both";
      } else if (!passwordValid) {
        reason = "password";
      } else {
        reason = "2fa";
      }

      return { ...baseUser, inactiveAdminReason: reason };
    }

    return baseUser;
  }
}
