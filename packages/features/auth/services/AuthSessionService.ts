import type { LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import type { AppLogger } from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { PrismaClient } from "@calcom/prisma";
import { IdentityProvider, type MembershipRole, type UserPermissionRole } from "@calcom/prisma/enums";
import type { Account, Session, User } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";
import type { AuthGoogleCalendarService } from "./AuthGoogleCalendarService";

type ProfileRepository = {
  findAllProfilesForUserIncludingMovedUser: (user: {
    id: number;
    username: string | null;
  }) => Promise<Array<{ id: number | null; upId: string; username: string | null }>>;
  findByUpIdWithAuth: (
    upId: string,
    userId: number
  ) => Promise<{
    id: number | null;
    username: string | null;
    organization: {
      id: number;
      name: string;
      slug: string | null;
      requestedSlug: string | null;
      logoUrl: string | null;
      isPlatform: boolean;
    } | null;
  } | null>;
};

type LicenseKeyService = {
  checkLicense: () => Promise<boolean>;
};

type SamlIdpUser = {
  userId: number;
  profile?: { upId?: string };
};

export interface IAuthSessionServiceDeps {
  googleCalendarService: Pick<AuthGoogleCalendarService, "autoInstallIfEligible">;
  prisma: PrismaClient;
  profileRepository: ProfileRepository;
  licenseKeyService: LicenseKeyService;
  log: Pick<AppLogger, "debug" | "warn" | "error" | "info">;
}

interface EnrichTokenParams {
  token: JWT;
  trigger?: string;
  session?: any;
  user?: User | AdapterUser;
  account?: Account | null;
}

export class AuthSessionService {
  constructor(private readonly deps: IAuthSessionServiceDeps) {}

  async enrichToken(params: EnrichTokenParams): Promise<JWT> {
    const { token, trigger, session, user, account } = params;

    this.deps.log.debug("callbacks:jwt", safeStringify({ token, user, account, trigger, session }));

    // Session update trigger - merge session data into token
    if (trigger === "update") {
      return {
        ...token,
        profileId: session?.profileId ?? token.profileId ?? null,
        upId: session?.upId ?? token.upId ?? null,
        locale: session?.locale ?? token.locale ?? "en",
        name: session?.name ?? token.name,
        username: session?.username ?? token.username,
        email: session?.email ?? token.email,
      } as JWT;
    }

    if (!user) {
      return this.autoMergeIdentities(token);
    }

    if (!account) {
      return token;
    }

    if (account.type === "credentials") {
      // Credentials authorize() always returns Cal.com's augmented User (with id: number)
      return this.handleCredentialsToken(token, user as User, account);
    }

    if (account.type === "oauth") {
      return this.handleOAuthToken(token, user, account);
    }

    if (account.type === "email") {
      return this.autoMergeIdentities(token);
    }

    this.deps.log.warn(
      "callbacks:jwt - unknown account type",
      safeStringify({ accountType: account.type, accountProvider: account.provider })
    );
    return token;
  }

  async buildSession(session: Session, token: JWT): Promise<Session> {
    this.deps.log.debug("callbacks:session", safeStringify({ session, token }));

    const hasValidLicense = await this.deps.licenseKeyService.checkLicense();
    const profileId = token.profileId;

    return {
      ...session,
      profileId,
      upId: token.upId || (session as any).upId,
      hasValidLicense,
      user: {
        ...session.user,
        id: token.id as number,
        name: token.name,
        username: token.username as string,
        orgAwareUsername: token.orgAwareUsername,
        role: token.role as UserPermissionRole,
        impersonatedBy: token.impersonatedBy,
        belongsToActiveTeam: token?.belongsToActiveTeam as boolean,
        org: token?.org,
        locale: token.locale,
        inactiveAdminReason: token.inactiveAdminReason,
      },
    } as Session;
  }

  private handleCredentialsToken(token: JWT, user: User, account: Account): JWT {
    this.deps.log.debug("callbacks:jwt:accountType:credentials", safeStringify({ account }));

    if (account.provider === "saml-idp") {
      const samlIdpUser = user as unknown as SamlIdpUser;
      return {
        ...token,
        sub: samlIdpUser.userId.toString(),
        upId: samlIdpUser.profile?.upId ?? token.upId ?? null,
      } as JWT;
    }

    return {
      ...token,
      id: user.id,
      name: user.name,
      username: user.username,
      orgAwareUsername: user?.org ? user.profile?.username : user.username,
      email: user.email,
      role: user.role,
      impersonatedBy: user.impersonatedBy,
      belongsToActiveTeam: user?.belongsToActiveTeam,
      org: user?.org,
      locale: user?.locale,
      profileId: user.profile?.id ?? token.profileId ?? null,
      upId: user.profile?.upId ?? token.upId ?? null,
      inactiveAdminReason: user.inactiveAdminReason,
    } as JWT;
  }

  private async handleOAuthToken(token: JWT, user: User | AdapterUser, account: Account): Promise<JWT> {
    this.deps.log.debug("callbacks:jwt:accountType:oauth", safeStringify({ account }));

    if (!account.provider || !account.providerAccountId) {
      const upId = "profile" in user ? (user as User).profile?.upId : undefined;
      return { ...token, upId: upId ?? token.upId ?? null } as JWT;
    }

    const idP = account.provider === "saml" ? IdentityProvider.SAML : IdentityProvider.GOOGLE;

    const existingUser = await this.deps.prisma.user.findFirst({
      where: {
        AND: [{ identityProvider: idP }, { identityProviderId: account.providerAccountId }],
      },
    });

    if (!existingUser) {
      return this.autoMergeIdentities(token);
    }

    // Auto-install Google Calendar if eligible
    const grantedScopes = account.scope?.split(" ") ?? [];
    await this.deps.googleCalendarService.autoInstallIfEligible({
      userId: Number(user.id),
      account,
      grantedScopes,
    });

    const allProfiles =
      await this.deps.profileRepository.findAllProfilesForUserIncludingMovedUser(existingUser);
    const { upId } = this.determineProfile(allProfiles, token);
    this.deps.log.debug(
      "callbacks:jwt:accountType:oauth:existingUser",
      safeStringify({ existingUser, upId })
    );

    return {
      ...token,
      upId,
      id: existingUser.id,
      name: existingUser.name,
      username: existingUser.username,
      email: existingUser.email,
      role: existingUser.role,
      impersonatedBy: token.impersonatedBy,
      belongsToActiveTeam: token?.belongsToActiveTeam as boolean,
      org: token?.org,
      orgAwareUsername: token.orgAwareUsername,
      locale: existingUser.locale,
    } as JWT;
  }

  private async autoMergeIdentities(token: JWT): Promise<JWT> {
    const { IS_TEAM_BILLING_ENABLED } = await import("@calcom/lib/constants");
    const { teamMetadataSchema } = await import("@calcom/prisma/zod-utils");
    const { getOrgFullOrigin, subdomainSuffix } = await import(
      "@calcom/features/ee/organizations/lib/orgDomains"
    );

    const existingUser = await this.deps.prisma.user.findFirst({
      where: { email: token.email! },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        name: true,
        email: true,
        role: true,
        locale: true,
        movedToProfileId: true,
        teams: {
          include: {
            team: {
              select: {
                id: true,
                metadata: true,
              },
            },
          },
        },
      },
    });

    if (!existingUser) {
      return token;
    }

    const belongsToActiveTeam = existingUser.teams.some((m: { team: { metadata: unknown } }) => {
      if (!IS_TEAM_BILLING_ENABLED) return true;
      const metadata = teamMetadataSchema.safeParse(m.team.metadata);
      return metadata.success && metadata.data?.subscriptionId;
    });

    const { teams: _teams, ...existingUserWithoutTeamsField } = existingUser;
    const allProfiles =
      await this.deps.profileRepository.findAllProfilesForUserIncludingMovedUser(existingUser);

    this.deps.log.debug("callbacks:jwt:autoMergeIdentities", safeStringify({ allProfiles }));

    const { upId } = this.determineProfile(allProfiles, token);

    const profile = await this.deps.profileRepository.findByUpIdWithAuth(upId, existingUser.id);
    if (!profile) {
      throw new Error("Profile not found");
    }

    const profileOrg = profile.organization;
    let orgRole: MembershipRole | undefined;

    if (profileOrg) {
      const membership = await this.deps.prisma.membership.findUnique({
        where: {
          userId_teamId: {
            teamId: profileOrg.id,
            userId: existingUser.id,
          },
        },
      });
      orgRole = membership?.role;
    }

    return {
      ...existingUserWithoutTeamsField,
      ...token,
      profileId: profile.id,
      upId,
      belongsToActiveTeam,
      orgAwareUsername: profileOrg ? profile.username : existingUser.username,
      org:
        profileOrg && !profileOrg.isPlatform
          ? {
              id: profileOrg.id,
              name: profileOrg.name,
              slug: profileOrg.slug ?? profileOrg.requestedSlug ?? "",
              logoUrl: profileOrg.logoUrl,
              fullDomain: getOrgFullOrigin(profileOrg.slug ?? profileOrg.requestedSlug ?? ""),
              domainSuffix: subdomainSuffix(),
              role: orgRole as MembershipRole,
            }
          : null,
    } as JWT;
  }

  private determineProfile(
    profiles: Array<{ id: number | null; upId: string; username: string | null }>,
    token: JWT
  ): { upId: string } {
    // If token already has a valid upId that matches a profile, keep it
    if (token.upId) {
      const matchingProfile = profiles.find((p) => p.upId === token.upId);
      if (matchingProfile) return { upId: matchingProfile.upId };
    }
    // Otherwise use the first profile
    if (profiles.length > 0) {
      return { upId: profiles[0].upId };
    }
    return { upId: token.upId ?? "" };
  }
}
