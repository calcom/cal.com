import { waitUntil } from "@vercel/functions";
import type { Account, User } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";

import type { AppLogger } from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import slugify from "@calcom/lib/slugify";
import { randomString } from "@calcom/lib/random";
import type { TrackingData } from "@calcom/lib/tracking";
import type { PrismaClient } from "@calcom/prisma";
import { CreationSource, IdentityProvider, MembershipRole } from "@calcom/prisma/enums";

import { getOrgUsernameFromEmail } from "../signup/utils/getOrgUsernameFromEmail";
import type { AuthAccountRepository } from "../repositories/AuthAccountRepository";
import type { AuthOrgAutoLinkService } from "./AuthOrgAutoLinkService";

type ValidatedOAuthUser = (User | AdapterUser) & { email: string; name: string };

type CalcomAdapter = {
  linkAccount: (data: Record<string, unknown>) => Promise<void>;
};

type SamlValidationResult = {
  allowed: boolean;
  errorUrl?: string;
};

export interface IAuthAccountLinkingServiceDeps {
  authAccountRepo: Pick<
    AuthAccountRepository,
    | "findByIdentityProviderWithAccountsForProvider"
    | "findAndFixLegacyIdentityProviderId"
    | "findByEmailWithPassword"
    | "updateIdentityProvider"
    | "updateIdentityProviderAndEmail"
    | "updateEmail"
    | "claimInvitedUser"
  >;
  orgAutoLinkService: Pick<AuthOrgAutoLinkService, "checkOrgMembership">;
  validateSamlAccountConversion: (
    tenant: string | undefined,
    email: string,
    context: string
  ) => Promise<SamlValidationResult>;
  calcomAdapter: CalcomAdapter;
  loginWithTotp: (email: string) => Promise<string>;
  hostedCal: boolean;
  log: Pick<AppLogger, "debug" | "warn" | "error" | "info">;
  prisma: PrismaClient;
}

interface OAuthSignInParams {
  user: ValidatedOAuthUser;
  account: Account;
  profile?: unknown;
  idP: IdentityProvider;
  samlTenant: string | undefined;
  getTrackingData?: () => TrackingData;
}

const usernameSlug = (username: string) => `${slugify(username)}-${randomString(6).toLowerCase()}`;
const getDomainFromEmail = (email: string): string => email.split("@")[1];

const AdapterAccountPresenter = {
  fromCalAccount: (account: Account, userId: number, providerEmail: string) => {
    return {
      ...account,
      userId: String(userId),
      providerEmail,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      type: account.type,
    };
  },
};

export class AuthAccountLinkingService {
  constructor(private readonly deps: IAuthAccountLinkingServiceDeps) {}

  async handleOAuthSignIn(params: OAuthSignInParams): Promise<boolean | string> {
    const { user, account, idP, samlTenant, getTrackingData } = params;

    // Step 1: Look up existing user by identity provider + providerAccountId
    let existingUser = await this.deps.authAccountRepo.findByIdentityProviderWithAccountsForProvider(
      idP,
      account.providerAccountId,
      account.provider
    );

    // Legacy fix: try finding by old userId-based identityProviderId
    if (!existingUser) {
      existingUser = await this.deps.authAccountRepo.findAndFixLegacyIdentityProviderId(
        idP,
        String(user.id),
        account.providerAccountId
      );
    }

    // Step 2: Route to the appropriate scenario
    if (existingUser) {
      return this.handleExistingIdentityUser(existingUser, user, account, idP);
    }

    // Step 3: No IdP match - check by email
    const existingUserWithEmail = await this.deps.authAccountRepo.findByEmailWithPassword(user.email!);

    if (existingUserWithEmail) {
      return this.handleExistingEmailUser(existingUserWithEmail, user, account, idP, samlTenant);
    }

    // Step 4: Brand new user
    return this.handleNewUser(user, account, idP, getTrackingData);
  }

  /**
   * User found by identity provider match.
   * Handles: email unchanged (link account + 2FA), email changed (conflict check + update).
   */
  private async handleExistingIdentityUser(
    existingUser: NonNullable<
      Awaited<ReturnType<AuthAccountRepository["findByIdentityProviderWithAccountsForProvider"]>>
    >,
    oauthUser: ValidatedOAuthUser,
    account: Account,
    idP: IdentityProvider
  ): Promise<boolean | string> {
    if (existingUser.email === oauthUser.email) {
      // Same email - link account if needed, check 2FA
      try {
        if (existingUser.accounts.length === 0) {
          const linkAccountData = AdapterAccountPresenter.fromCalAccount(
            account,
            existingUser.id,
            oauthUser.email
          );
          await this.deps.calcomAdapter.linkAccount(linkAccountData);
        }
      } catch (error) {
        if (error instanceof Error) {
          this.deps.log.error("Error while linking account of already existing user", safeStringify(error));
        }
      }

      if (existingUser.twoFactorEnabled && existingUser.identityProvider === idP) {
        return this.deps.loginWithTotp(existingUser.email);
      }
      return true;
    }

    // Email changed - check for conflicts
    const userWithNewEmail = await this.deps.prisma.user.findFirst({
      where: { email: oauthUser.email },
    });

    if (!userWithNewEmail) {
      await this.deps.authAccountRepo.updateEmail(existingUser.id, oauthUser.email);
      if (existingUser.twoFactorEnabled) {
        return this.deps.loginWithTotp(existingUser.email);
      }
      return true;
    }

    return "/auth/error?error=new-email-conflict";
  }

  /**
   * No IdP match but found user by email.
   * Routes to: self-hosted auto-merge, invited user claim, CAL->OAuth upgrade, Google->SAML upgrade.
   */
  private async handleExistingEmailUser(
    existingUserWithEmail: NonNullable<
      Awaited<ReturnType<AuthAccountRepository["findByEmailWithPassword"]>>
    >,
    oauthUser: ValidatedOAuthUser,
    account: Account,
    idP: IdentityProvider,
    samlTenant: string | undefined
  ): Promise<boolean | string> {
    // Scenario A: Self-hosted auto-merge (non-hosted, verified, non-CAL provider)
    if (
      !this.deps.hostedCal &&
      existingUserWithEmail.emailVerified &&
      existingUserWithEmail.identityProvider !== IdentityProvider.CAL
    ) {
      return this.handleSelfHostedAutoMerge(existingUserWithEmail, idP, samlTenant, oauthUser.email);
    }

    // Scenario B: Invited user (no password, not verified, no username)
    if (
      !existingUserWithEmail.password?.hash &&
      !existingUserWithEmail.emailVerified &&
      !existingUserWithEmail.username
    ) {
      return this.handleInvitedUserClaim(existingUserWithEmail, oauthUser, account, idP, samlTenant);
    }

    // Scenario C: CAL user trying to link Google/SAML
    if (
      existingUserWithEmail.identityProvider === IdentityProvider.CAL &&
      (idP === IdentityProvider.GOOGLE || idP === IdentityProvider.SAML)
    ) {
      return this.handleCalToOAuthUpgrade(existingUserWithEmail, oauthUser, account, idP, samlTenant);
    }

    // Scenario D: CAL user with wrong provider (not Google/SAML)
    if (existingUserWithEmail.identityProvider === IdentityProvider.CAL) {
      this.deps.log.error(`Userid ${oauthUser.id} already exists with CAL identity provider`);
      return `/auth/error?error=wrong-provider&provider=${existingUserWithEmail.identityProvider}`;
    }

    // Scenario E: Google user upgrading to SAML
    if (
      existingUserWithEmail.identityProvider === IdentityProvider.GOOGLE &&
      idP === IdentityProvider.SAML
    ) {
      return this.handleGoogleToSamlUpgrade(existingUserWithEmail, oauthUser, account, idP, samlTenant);
    }

    // Fallback: wrong provider
    this.deps.log.error(`Userid ${oauthUser.id} trying to login with the wrong provider`, {
      userId: oauthUser.id,
      account: {
        providerAccountId: account.providerAccountId,
        type: account.type,
        provider: account.provider,
      },
    });
    return `/auth/error?error=wrong-provider&provider=${existingUserWithEmail.identityProvider}`;
  }

  /**
   * Self-hosted auto-merge: verified email + non-CAL provider on non-hosted instance.
   */
  private async handleSelfHostedAutoMerge(
    existingUser: { email: string; twoFactorEnabled: boolean },
    idP: IdentityProvider,
    samlTenant: string | undefined,
    _email: string
  ): Promise<boolean | string> {
    if (idP === IdentityProvider.SAML) {
      const validation = await this.deps.validateSamlAccountConversion(
        samlTenant,
        existingUser.email,
        "SelfHosted→SAML"
      );
      if (!validation.allowed) {
        return validation.errorUrl!;
      }
    }

    if (existingUser.twoFactorEnabled) {
      return this.deps.loginWithTotp(existingUser.email);
    }
    return true;
  }

  /**
   * Claim an invited user (no password, no emailVerified, no username).
   */
  private async handleInvitedUserClaim(
    existingUser: { email: string; twoFactorEnabled: boolean },
    oauthUser: ValidatedOAuthUser,
    account: Account,
    idP: IdentityProvider,
    samlTenant: string | undefined
  ): Promise<boolean | string> {
    if (idP === IdentityProvider.SAML) {
      const validation = await this.deps.validateSamlAccountConversion(
        samlTenant,
        oauthUser.email,
        "Invite→SAML"
      );
      if (!validation.allowed) {
        return validation.errorUrl!;
      }
    }

    await this.deps.authAccountRepo.claimInvitedUser(
      existingUser.email,
      oauthUser.email,
      oauthUser.name,
      getOrgUsernameFromEmail(oauthUser.email, getDomainFromEmail(oauthUser.email)),
      idP,
      account.providerAccountId
    );

    if (existingUser.twoFactorEnabled) {
      return this.deps.loginWithTotp(existingUser.email);
    }
    return true;
  }

  /**
   * CAL user upgrading to Google or SAML OAuth.
   */
  private async handleCalToOAuthUpgrade(
    existingUser: { id: number; email: string; emailVerified: Date | null; twoFactorEnabled: boolean },
    oauthUser: ValidatedOAuthUser,
    account: Account,
    idP: IdentityProvider,
    samlTenant: string | undefined
  ): Promise<boolean | string> {
    // Prevent account pre-hijacking: block OAuth linking for unverified accounts
    if (!existingUser.emailVerified) {
      return "/auth/error?error=unverified-email";
    }

    if (idP === IdentityProvider.SAML) {
      const validation = await this.deps.validateSamlAccountConversion(
        samlTenant,
        oauthUser.email,
        "CAL→SAML"
      );
      if (!validation.allowed) {
        return validation.errorUrl!;
      }
    }

    await this.deps.authAccountRepo.updateIdentityProviderAndEmail(
      existingUser.id,
      idP,
      account.providerAccountId,
      oauthUser.email
    );

    if (existingUser.twoFactorEnabled) {
      return this.deps.loginWithTotp(existingUser.email);
    }
    return true;
  }

  /**
   * Google user upgrading to SAML.
   */
  private async handleGoogleToSamlUpgrade(
    existingUser: { id: number; email: string; twoFactorEnabled: boolean },
    oauthUser: ValidatedOAuthUser,
    account: Account,
    idP: IdentityProvider,
    samlTenant: string | undefined
  ): Promise<boolean | string> {
    const validation = await this.deps.validateSamlAccountConversion(
      samlTenant,
      oauthUser.email,
      "Google→SAML"
    );
    if (!validation.allowed) {
      return validation.errorUrl!;
    }

    await this.deps.authAccountRepo.updateIdentityProviderAndEmail(
      existingUser.id,
      idP,
      account.providerAccountId,
      oauthUser.email
    );

    if (existingUser.twoFactorEnabled) {
      return this.deps.loginWithTotp(existingUser.email);
    }
    return true;
  }

  /**
   * No existing user found at all - create a new account.
   */
  private async handleNewUser(
    oauthUser: ValidatedOAuthUser,
    account: Account,
    idP: IdentityProvider,
    getTrackingData?: () => TrackingData
  ): Promise<boolean | string> {
    const { orgUsername, orgId } = await this.deps.orgAutoLinkService.checkOrgMembership(
      idP,
      oauthUser.email
    );

    try {
      const newUsername = orgId ? slugify(orgUsername) : usernameSlug(oauthUser.name);
      const newUser = await this.deps.prisma.user.create({
        data: {
          username: newUsername,
          emailVerified: new Date(Date.now()),
          name: oauthUser.name,
          ...(oauthUser.image && { avatarUrl: oauthUser.image }),
          email: oauthUser.email,
          identityProvider: idP,
          identityProviderId: account.providerAccountId,
          ...(orgId && {
            verified: true,
            organization: { connect: { id: orgId } },
            teams: {
              create: {
                role: MembershipRole.MEMBER,
                accepted: true,
                team: { connect: { id: orgId } },
              },
            },
          }),
          creationSource: CreationSource.WEBAPP,
        },
      });

      const linkAccountData = AdapterAccountPresenter.fromCalAccount(account, newUser.id, oauthUser.email);
      await this.deps.calcomAdapter.linkAccount(linkAccountData);

      // Create Stripe customer asynchronously
      waitUntil(
        (async () => {
          try {
            const tracking = getTrackingData?.();
            const { getBillingProviderService } = await import(
              "@calcom/features/ee/billing/di/containers/Billing"
            );
            const billingService = getBillingProviderService();
            const customer = await billingService.createCustomer({
              email: newUser.email,
              metadata: {
                email: newUser.email,
                username: newUser.username ?? newUsername,
                ...tracking,
              },
            });
            await this.deps.prisma.user.update({
              where: { id: newUser.id },
              data: {
                metadata: {
                  stripeCustomerId: customer.stripeCustomerId,
                },
              },
            });
          } catch (err) {
            this.deps.log.error("Failed to create Stripe customer with tracking", err);
          }
        })()
      );

      if ((account as Record<string, unknown>).twoFactorEnabled) {
        return this.deps.loginWithTotp(newUser.email);
      }
      return true;
    } catch (err) {
      this.deps.log.error("Error creating a new user", err);
      return "/auth/error?error=user-creation-error";
    }
  }
}
