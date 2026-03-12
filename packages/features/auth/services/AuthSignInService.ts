import type { Account, User } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";

import type { AppLogger } from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { TrackingData } from "@calcom/lib/tracking";
import { IdentityProvider } from "@calcom/prisma/enums";

import type { AuthAccountLinkingService } from "./AuthAccountLinkingService";

export interface IAuthSignInServiceDeps {
  accountLinkingService: Pick<AuthAccountLinkingService, "handleOAuthSignIn">;
  log: Pick<AppLogger, "debug" | "warn" | "error" | "info">;
}

interface SignInParams {
  user: User | AdapterUser;
  account: Account | null;
  profile?: any;
  getTrackingData?: () => TrackingData;
}

const mapIdentityProvider = (providerName: string): IdentityProvider => {
  switch (providerName) {
    case "saml-idp":
    case "saml":
      return IdentityProvider.SAML;
    default:
      return IdentityProvider.GOOGLE;
  }
};

export class AuthSignInService {
  constructor(private readonly deps: IAuthSignInServiceDeps) {}

  async handleSignIn(params: SignInParams): Promise<boolean | string> {
    const { user, account, profile, getTrackingData } = params;

    this.deps.log.debug("auth:signIn", safeStringify(params));

    if (account?.provider === "email") {
      return true;
    }

    // Credentials (non-saml-idp) already verified in authorize() callback
    if (account?.provider !== "saml-idp" && account?.type === "credentials") {
      return true;
    }

    // saml-idp uses type "credentials" but should continue past this check
    if (account?.provider !== "saml-idp" && account?.type !== "oauth") {
      this.deps.log.warn("auth:signIn:denied", {
        reason: "unsupported_account_type",
        accountType: account?.type,
        provider: account?.provider,
      });
      return false;
    }

    if (!user.email) {
      this.deps.log.warn("auth:signIn:denied", {
        reason: "missing_email",
        provider: account?.provider,
      });
      return false;
    }

    if (!user.name) {
      this.deps.log.warn("auth:signIn:denied", {
        reason: "missing_name",
        emailDomain: user.email.split("@")[1],
        provider: account?.provider,
      });
      return false;
    }

    if (!account?.provider) {
      this.deps.log.warn("auth:signIn:denied", { reason: "missing_provider" });
      return false;
    }

    const emailVerified = this.isEmailVerified(user, profile);
    if (!emailVerified) {
      this.deps.log.error("auth:signIn:denied", {
        reason: "unverified_email",
        provider: account.provider,
        user: safeStringify(user),
      });
      return "/auth/error?error=unverified-email";
    }

    const idP = mapIdentityProvider(account.provider);
    const samlTenant = this.extractSamlTenant(user, account, profile);

    // Safe: email and name are validated by the guards above
    const validatedUser = user as (User | AdapterUser) & { email: string; name: string };

    return this.deps.accountLinkingService.handleOAuthSignIn({
      user: validatedUser,
      account,
      profile,
      idP,
      samlTenant,
      getTrackingData,
    });
  }

  private isEmailVerified(user: User | AdapterUser, profile?: any): boolean {
    return !!(
      (user as any).email_verified ||
      (user as any).emailVerified ||
      profile?.email_verified
    );
  }

  private extractSamlTenant(user: User | AdapterUser, account: Account, profile?: any): string | undefined {
    if ((user as any).samlTenant) return (user as any).samlTenant;

    if (account.provider === "saml") {
      return (profile as { requested?: { tenant?: string } } | undefined)?.requested?.tenant;
    }

    return undefined;
  }
}
