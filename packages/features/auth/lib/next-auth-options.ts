import ImpersonationProvider from "@calid/features/modules/impersonation/ImpersonationProvider";
import { calendar_v3 } from "@googleapis/calendar";
import type { Membership, Team, UserPermissionRole } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { serialize } from "cookie";
import { OAuth2Client } from "googleapis-common";
import type { AuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { encode } from "next-auth/jwt";
import type { Provider } from "next-auth/providers";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";

import { updateProfilePhotoGoogle } from "@calcom/app-store/_utils/oauth/updateProfilePhotoGoogle";
import GoogleCalendarService from "@calcom/app-store/googlecalendar/lib/CalendarService";
import { LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import createUsersAndConnectToOrg from "@calcom/features/ee/dsync/lib/users/createUsersAndConnectToOrg";
import { getOrgFullOrigin, subdomainSuffix } from "@calcom/features/ee/organizations/lib/orgDomains";
import { clientSecretVerifier, hostedCal, isSAMLLoginEnabled } from "@calcom/features/ee/sso/lib/saml";
import { UsersRepository } from "@calcom/features/users/users.repository";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import {
  GOOGLE_CALENDAR_SCOPES,
  GOOGLE_OAUTH_SCOPES,
  HOSTED_CAL_FEATURES,
  IS_CALCOM,
} from "@calcom/lib/constants";
import { ENABLE_PROFILE_SWITCHER, IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { symmetricDecrypt, symmetricEncrypt } from "@calcom/lib/crypto";
import { defaultCookies } from "@calcom/lib/default-cookies";
import { sanitizeDeviceString } from "@calcom/lib/deviceDetection";
import { isENVDev } from "@calcom/lib/env";
import getIP from "@calcom/lib/getIP";
import { checkIfUserNameTaken, usernameSlugRandom } from "@calcom/lib/getName";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { sendUserToMakeWebhook } from "@calcom/lib/sendUserToWebhook";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import { DeploymentRepository } from "@calcom/lib/server/repository/deployment";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { UserRepository } from "@calcom/lib/server/repository/user";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { CreationSource } from "@calcom/prisma/enums";
import { IdentityProvider, MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema, userMetadata } from "@calcom/prisma/zod-utils";

import { ErrorCode } from "./ErrorCode";
import { dub } from "./dub";
import { isPasswordValid } from "./isPasswordValid";
import CalComAdapter from "./next-auth-custom-adapter";
import { verifyCalPassword } from "./verifyPassword";

const log = logger.getSubLogger({ prefix: ["next-auth-options"] });
const GOOGLE_API_CREDENTIALS = process.env.GOOGLE_API_CREDENTIALS || "{}";
const { client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET } =
  JSON.parse(GOOGLE_API_CREDENTIALS)?.web || {};
const GOOGLE_LOGIN_ENABLED = process.env.GOOGLE_LOGIN_ENABLED === "true";
const IS_GOOGLE_LOGIN_ENABLED = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_LOGIN_ENABLED);
const ORGANIZATIONS_AUTOLINK =
  process.env.ORGANIZATIONS_AUTOLINK === "1" || process.env.ORGANIZATIONS_AUTOLINK === "true";

const getDomainFromEmail = (email: string): string => email.split("@")[1];

const loginWithTotp = async (email: string) =>
  `/auth/login?totp=${await (await import("./signJwt")).default({ email })}`;

type UserTeams = {
  teams: (Membership & {
    team: Pick<Team, "metadata">;
  })[];
};

export const checkIfUserBelongsToActiveTeam = <T extends UserTeams>(user: T) =>
  user.teams.some((m: { team: { metadata: unknown } }) => {
    if (!IS_TEAM_BILLING_ENABLED) {
      return true;
    }

    const metadata = teamMetadataSchema.safeParse(m.team.metadata);

    return metadata.success && metadata.data?.subscriptionId;
  });

const checkIfUserShouldBelongToOrg = async (idP: IdentityProvider, email: string) => {
  const [orgUsername, apexDomain] = email.split("@");
  if (!ORGANIZATIONS_AUTOLINK || idP !== "GOOGLE") return { orgUsername, orgId: undefined };
  const existingOrg = await prisma.team.findFirst({
    where: {
      organizationSettings: {
        isOrganizationVerified: true,
        orgAutoAcceptEmail: apexDomain,
      },
    },
    select: {
      id: true,
    },
  });
  return { orgUsername, orgId: existingOrg?.id };
};

/**
 * Helper function to fetch UTM parameters from cookies
 * Supports both Google and SAML identity providers
 */
async function fetchUTMfromCookies(idP: IdentityProvider, utmString?: string) {
  try {
    const supportedProviders = [IdentityProvider.GOOGLE, IdentityProvider.SAML];
    if (!supportedProviders.includes(idP) || !utmString) {
      return null;
    }
    return JSON.parse(utmString);
  } catch (err) {
    log.error("Error fetching UTM from cookies", err);
    return null;
  }
}

/**
 * Helper function to fetch device details from cookies
 * Only supports Google identity provider
 */
async function fetchDeviceDetailsFromCookies(idP: IdentityProvider, deviceString?: string) {
  try {
    if (idP !== IdentityProvider.GOOGLE || !deviceString) {
      return null;
    }
    return JSON.parse(deviceString);
  } catch (err) {
    log.error("Error fetching device details from cookies", err);
    return null;
  }
}

/**
 * Helper function to safely update user metadata with UTM parameters
 */
async function updateUserUTMIfNeeded(
  userId: number,
  existingMetadata: Record<string, unknown>,
  idP: IdentityProvider,
  utmCookie?: string
) {
  if (existingMetadata.utm) {
    return; // User already has UTM data
  }

  const utm = await fetchUTMfromCookies(idP, utmCookie);
  if (!utm) {
    return;
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...existingMetadata,
          utm,
        },
      },
    });
  } catch (error) {
    log.error("Failed to update user UTM metadata", { userId, error });
  }
}

/**
 * Helper function to safely update user metadata with device details
 * Only for Google identity provider
 */
async function updateUserDeviceDetailsIfNeeded(
  userId: number,
  existingMetadata: Record<string, unknown>,
  idP: IdentityProvider,
  deviceCookie?: string,
  request?: any
) {
  if (idP !== IdentityProvider.GOOGLE || existingMetadata.deviceDetails) {
    return; // Only for Google and if user doesn't have device details
  }

  const deviceDetails = await fetchDeviceDetailsFromCookies(idP, deviceCookie);
  if (!deviceDetails) {
    return;
  }

  try {
    const ip = request ? getIP(request) : "Unknown";
    const processedDeviceDetails = {
      ip: ip || "Unknown",
      browser: sanitizeDeviceString(deviceDetails.browser),
      deviceType: deviceDetails.deviceType,
      deviceOS: sanitizeDeviceString(deviceDetails.deviceOS),
      screenResolution: sanitizeDeviceString(deviceDetails.screenResolution),
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...existingMetadata,
          deviceDetails: processedDeviceDetails,
        },
      },
    });
  } catch (error) {
    log.error("Failed to update user device details metadata", { userId, error });
  }
}

/**
 * Validates password for credential-based authentication
 * FIXED: Consolidated logic to avoid contradictory conditions
 */
function validatePasswordForAuth(
  user: { password: { hash: string; salt: string | null } | null; identityProvider: IdentityProvider },
  credentials: { password: string; totpCode?: string }
): boolean {
  // If user doesn't have a password hash
  if (!user.password?.hash) {
    // CAL identity provider users MUST have a password
    if (user.identityProvider === IdentityProvider.CAL) {
      throw new Error(ErrorCode.IncorrectEmailPassword);
    }
    // Non-CAL users without password must use 2FA or other auth method
    return false;
  }

  // If user has a password, verify it (unless using 2FA flow)
  if (!credentials.totpCode) {
    const isCorrectPassword = verifyCalPassword({
      inputPassword: credentials.password,
      storedHashBase64: user.password.hash,
      saltBase64: user.password.salt || "",
      iterations: 27500,
    });

    if (!isCorrectPassword) {
      throw new Error(ErrorCode.IncorrectEmailPassword);
    }
  }

  return true;
}

/**
 * Validates admin role security requirements
 * FIXED: Returns actual role or throws error instead of undefined INACTIVE_ADMIN
 */
function validateAdminRole(
  role: UserPermissionRole,
  user: { identityProvider: IdentityProvider; twoFactorEnabled: boolean },
  password: string
): UserPermissionRole {
  // Non-admin users pass through
  if (role !== "ADMIN") {
    return role;
  }

  // Non-CAL identity providers (OAuth, SAML) don't need password validation
  if (user.identityProvider !== IdentityProvider.CAL) {
    return role;
  }

  // E2E testing bypass
  if (process.env.NEXT_PUBLIC_IS_E2E) {
    log.warn("E2E testing enabled: Bypassing admin security requirements");
    return role;
  }

  // Development environment bypass
  if (isENVDev) {
    log.warn("Development environment: Bypassing admin security requirements");
    return role;
  }

  // Production admin requirements: strong password AND 2FA
  const hasStrongPassword = isPasswordValid(password, false, true);
  if (!hasStrongPassword) {
    log.warn("Admin login blocked: Password does not meet security requirements", { userId: user });
    throw new Error(ErrorCode.WeakAdminPassword);
  }

  if (!user.twoFactorEnabled) {
    log.warn("Admin login blocked: Two-factor authentication not enabled", { userId: user });
    throw new Error(ErrorCode.SecondFactorRequired);
  }

  return role;
}

/**
 * Handles account linking for existing OAuth users
 */
async function linkOAuthAccountIfNeeded(
  existingUser: { id: number; accounts: any[] },
  account: any,
  userEmail: string
) {
  try {
    if (existingUser.accounts.length === 0) {
      const linkAccountWithUserData = {
        ...account,
        userId: existingUser.id,
        providerEmail: userEmail,
      };
      await calcomAdapter.linkAccount(linkAccountWithUserData);
      log.info("Linked OAuth account for existing user", { userId: existingUser.id });
    }
  } catch (error) {
    log.error("Error linking OAuth account", { userId: existingUser.id, error: safeStringify(error) });
    // Non-fatal: user can still log in
  }
}

const providers: Provider[] = [
  CredentialsProvider({
    id: "credentials",
    name: "Cal.com",
    type: "credentials",
    credentials: {
      email: { label: "Email Address", type: "email", placeholder: "john.doe@example.com" },
      password: { label: "Password", type: "password", placeholder: "Your super secure password" },
      totpCode: { label: "Two-factor Code", type: "input", placeholder: "Code from authenticator app" },
      backupCode: { label: "Backup Code", type: "input", placeholder: "Two-factor backup code" },
    },
    async authorize(credentials) {
      log.debug("CredentialsProvider:authorize", safeStringify({ email: credentials?.email }));

      if (!credentials) {
        log.error("Credentials missing in authorize callback");
        throw new Error(ErrorCode.InternalServerError);
      }

      const userRepo = new UserRepository(prisma);
      const lockedCheck = await prisma.user.findFirst({
        where: {
          email: credentials.email.toLowerCase(),
          OR: [{ locked: false }, { locked: true }],
        },
        select: { locked: true },
      });
      if (lockedCheck?.locked) {
        throw new Error(ErrorCode.UserAccountLocked);
      }

      const user = await userRepo.findByEmailAndIncludeProfilesAndPassword({
        email: credentials.email,
      });

      // FIXED: Generic error message to prevent user enumeration
      if (!user) {
        log.warn("Login attempt for non-existent user", { email: credentials.email });
        throw new Error(ErrorCode.IncorrectEmailPassword);
      }

      // Check if account is locked
      if (user.locked) {
        log.warn("Login attempt for locked account", { userId: user.id });
        throw new Error(ErrorCode.UserAccountLocked);
      }

      // Rate limiting
      await checkRateLimitAndThrowError({
        identifier: user.email,
      });

      // FIXED: Consolidated password validation logic
      validatePasswordForAuth(user, credentials);

      // Handle two-factor authentication
      if (user.twoFactorEnabled) {
        if (credentials.backupCode) {
          // Verify backup code
          if (!process.env.CALENDSO_ENCRYPTION_KEY) {
            log.error("Missing CALENDSO_ENCRYPTION_KEY for backup code verification");
            throw new Error(ErrorCode.InternalServerError);
          }

          if (!user.backupCodes) {
            log.warn("User has 2FA enabled but no backup codes", { userId: user.id });
            throw new Error(ErrorCode.MissingBackupCodes);
          }

          const backupCodes = JSON.parse(
            symmetricDecrypt(user.backupCodes, process.env.CALENDSO_ENCRYPTION_KEY)
          );

          const index = backupCodes.indexOf(credentials.backupCode.replaceAll("-", ""));
          if (index === -1) {
            log.warn("Invalid backup code attempt", { userId: user.id });
            throw new Error(ErrorCode.IncorrectBackupCode);
          }

          // Invalidate used backup code
          backupCodes[index] = null;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              backupCodes: symmetricEncrypt(JSON.stringify(backupCodes), process.env.CALENDSO_ENCRYPTION_KEY),
            },
          });
          log.info("Backup code used successfully", { userId: user.id });
        } else {
          // Verify TOTP code
          if (!credentials.totpCode) {
            throw new Error(ErrorCode.SecondFactorRequired);
          }

          if (!user.twoFactorSecret) {
            log.error("User has 2FA enabled but no secret stored", { userId: user.id });
            throw new Error(ErrorCode.InternalServerError);
          }

          if (!process.env.CALENDSO_ENCRYPTION_KEY) {
            log.error("Missing CALENDSO_ENCRYPTION_KEY for TOTP verification");
            throw new Error(ErrorCode.InternalServerError);
          }

          const secret = symmetricDecrypt(user.twoFactorSecret, process.env.CALENDSO_ENCRYPTION_KEY);
          if (secret.length !== 32) {
            log.error("Invalid 2FA secret length after decryption", {
              userId: user.id,
              expectedLength: 32,
              actualLength: secret.length,
            });
            throw new Error(ErrorCode.InternalServerError);
          }

          const isValidToken = (await import("@calcom/lib/totp")).totpAuthenticatorCheck(
            credentials.totpCode,
            secret
          );

          if (!isValidToken) {
            log.warn("Invalid TOTP code attempt", { userId: user.id });
            throw new Error(ErrorCode.IncorrectTwoFactorCode);
          }
          log.info("TOTP verification successful", { userId: user.id });
        }
      }

      // Check active team membership
      const hasActiveTeams = checkIfUserBelongsToActiveTeam(user);

      // FIXED: Validate admin role with proper error handling
      const validatedRole = validateAdminRole(
        user.role,
        {
          identityProvider: user.identityProvider,
          twoFactorEnabled: user.twoFactorEnabled,
        },
        credentials.password
      );

      log.info("User authenticated successfully", { userId: user.id, role: validatedRole });

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: validatedRole,
        belongsToActiveTeam: hasActiveTeams,
        locale: user.locale,
        profile: user.allProfiles[0],
        createdDate: user.createdDate,
      };
    },
  }),
  ImpersonationProvider,
];

if (IS_GOOGLE_LOGIN_ENABLED) {
  providers.push(
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: [...GOOGLE_OAUTH_SCOPES, ...GOOGLE_CALENDAR_SCOPES].join(" "),
          access_type: "offline",
          prompt: "select_account",
        },
      },
    })
  );
}

if (IS_GOOGLE_LOGIN_ENABLED) {
  // ADD THIS:
  providers.push(
    CredentialsProvider({
      id: "google-one-tap",
      name: "Google One Tap",
      credentials: {
        credential: { type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.credential) {
          throw new Error(ErrorCode.InternalServerError);
        }

        // Verify the Google ID token
        const client = new OAuth2Client(GOOGLE_CLIENT_ID);
        let payload: any;

        try {
          const ticket = await client.verifyIdToken({
            idToken: credentials.credential,
            audience: GOOGLE_CLIENT_ID,
          });
          const p = ticket.getPayload();
          if (!p) throw new Error("Empty payload");
          payload = p;
        } catch (err) {
          log.error("Google One Tap token verification failed", { err });
          throw new Error(ErrorCode.IncorrectEmailPassword);
        }

        if (!payload.email_verified || !payload.email) {
          throw new Error("unverified-email");
        }

        const email = payload.email.toLowerCase();

        // Check locked before anything else
        const lockedCheck = await prisma.user.findFirst({
          where: { email },
          select: { locked: true },
        });
        if (lockedCheck?.locked) {
          throw new Error(ErrorCode.UserAccountLocked);
        }

        await checkRateLimitAndThrowError({ identifier: email });

        // 1. Try to find user by Google identity provider + sub
        let existingUser = await prisma.user.findFirst({
          where: {
            AND: [{ identityProvider: IdentityProvider.GOOGLE }, { identityProviderId: payload.sub }],
          },
        });

        // 2. Fall back to email lookup (handles CAL users, invited users, etc.)
        if (!existingUser) {
          existingUser = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
          });

          if (existingUser) {
            // Migrate identity provider to Google if safe to do so
            const migratable =
              existingUser.identityProvider === IdentityProvider.CAL ||
              existingUser.identityProvider === IdentityProvider.GOOGLE;

            if (!migratable) {
              log.warn("One Tap provider mismatch", {
                email,
                existingProvider: existingUser.identityProvider,
              });
              throw new Error(`wrong-provider&provider=${existingUser.identityProvider}`);
            }

            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                identityProvider: IdentityProvider.GOOGLE,
                identityProviderId: payload.sub,
                ...(!existingUser.emailVerified && { emailVerified: new Date() }),
              },
            });
          }
        }

        // 3. Create brand-new user
        if (!existingUser) {
          try {
            const { orgUsername, orgId } = await checkIfUserShouldBelongToOrg(IdentityProvider.GOOGLE, email);
            const { existingUserWithUsername, username: _username } = await checkIfUserNameTaken({
              name: payload.name || "",
            });
            const username = orgId
              ? slugify(orgUsername)
              : existingUserWithUsername
              ? usernameSlugRandom(payload.name || "")
              : _username;

            existingUser = await prisma.user.create({
              data: {
                username,
                emailVerified: new Date(),
                name: payload.name || "",
                ...(payload.picture && { avatarUrl: payload.picture }),
                email,
                metadata: {
                  signupSource: "google-one-tap",
                },
                identityProvider: IdentityProvider.GOOGLE,
                identityProviderId: payload.sub,
                creationSource: CreationSource.WEBAPP,
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
              },
            });

            log.info("New user created via Google One Tap", { userId: existingUser.id });

            await sendUserToMakeWebhook({
              id: existingUser.id,
              email: existingUser.email,
              name: existingUser.name || "",
              username: existingUser.username || "",
              identityProvider: IdentityProvider.GOOGLE,
              createdAt: existingUser.createdDate,
            });
          } catch (err) {
            log.error("One Tap user creation failed", { email, error: safeStringify(err) });
            throw new Error("user-creation-error");
          }
        }

        if (existingUser.locked) {
          throw new Error(ErrorCode.UserAccountLocked);
        }

        // 2FA: signal to bridge API so it can redirect to TOTP page
        if (existingUser.twoFactorEnabled) {
          throw new Error(ErrorCode.SecondFactorRequired);
        }

        const userRepo = new UserRepository(prisma);
        const fullUser = await userRepo.findByEmailAndIncludeProfilesAndPassword({ email });
        const hasActiveTeams = fullUser ? checkIfUserBelongsToActiveTeam(fullUser) : false;

        return {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          username: existingUser.username,
          metadata: existingUser.metadata,
          role: existingUser.role,
          belongsToActiveTeam: hasActiveTeams,
          locale: existingUser.locale,
          profile: fullUser?.allProfiles[0],
          createdDate: existingUser.createdDate,
        };
      },
    })
  );
}

if (isSAMLLoginEnabled) {
  providers.push({
    id: "saml",
    name: "BoxyHQ",
    type: "oauth",
    version: "2.0",
    checks: ["pkce", "state"],
    authorization: {
      url: `${WEBAPP_URL}/api/auth/saml/authorize`,
      params: {
        scope: "",
        response_type: "code",
        provider: "saml",
      },
    },
    token: {
      url: `${WEBAPP_URL}/api/auth/saml/token`,
      params: { grant_type: "authorization_code" },
    },
    userinfo: `${WEBAPP_URL}/api/auth/saml/userinfo`,
    profile: async (profile: {
      id?: number;
      firstName?: string;
      lastName?: string;
      email?: string;
      locale?: string;
    }) => {
      log.debug("BoxyHQ:profile", safeStringify({ profile }));
      const userRepo = new UserRepository(prisma);
      const user = await userRepo.findByEmailAndIncludeProfilesAndPassword({
        email: profile.email || "",
      });
      return {
        id: profile.id || 0,
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        name: `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
        email_verified: true,
        locale: profile.locale,
        ...(user ? { profile: user.allProfiles[0] } : {}),
      };
    },
    options: {
      clientId: "dummy",
      clientSecret: clientSecretVerifier,
    },
    allowDangerousEmailAccountLinking: true,
  });

  // IdP initiated login
  providers.push(
    CredentialsProvider({
      id: "saml-idp",
      name: "IdP Login",
      credentials: {
        code: {},
      },
      async authorize(credentials) {
        log.debug("CredentialsProvider:saml-idp:authorize", safeStringify({ credentials }));
        if (!credentials?.code) {
          log.warn("SAML IdP login attempt without code");
          return null;
        }

        const { code } = credentials;

        try {
          const { oauthController } = await (await import("@calcom/features/ee/sso/lib/jackson")).default();

          // Fetch access token
          const { access_token } = await oauthController.token({
            code,
            grant_type: "authorization_code",
            redirect_uri: `${process.env.NEXTAUTH_URL}`,
            client_id: "dummy",
            client_secret: clientSecretVerifier,
          });

          if (!access_token) {
            log.warn("SAML IdP token exchange failed");
            return null;
          }

          // Fetch user info
          const userInfo = await oauthController.userInfo(access_token);

          if (!userInfo || !userInfo.email) {
            log.warn("SAML IdP userInfo missing or invalid");
            return null;
          }

          const { id, firstName, lastName } = userInfo;
          const email = userInfo.email.toLowerCase();
          const userRepo = new UserRepository(prisma);
          let user = await userRepo.findByEmailAndIncludeProfilesAndPassword({ email });

          if (!user) {
            const hostedCal = Boolean(HOSTED_CAL_FEATURES);
            if (hostedCal) {
              const domain = getDomainFromEmail(email);
              const org = await OrganizationRepository.getVerifiedOrganizationByAutoAcceptEmailDomain(domain);
              if (org) {
                const createUsersAndConnectToOrgProps = {
                  emailsToCreate: [email],
                  identityProvider: IdentityProvider.SAML,
                  identityProviderId: email,
                };
                await createUsersAndConnectToOrg({
                  createUsersAndConnectToOrgProps,
                  org,
                });
                user = await userRepo.findByEmailAndIncludeProfilesAndPassword({ email });
              }
            }
            if (!user) {
              log.warn("SAML IdP login for non-existent user", { email });
              throw new Error(ErrorCode.UserNotFound);
            }
          }

          const [userProfile] = user?.allProfiles;
          log.info("SAML IdP authentication successful", { userId: user.id });

          return {
            id: id as unknown as number,
            firstName,
            lastName,
            email,
            name: `${firstName} ${lastName}`.trim(),
            email_verified: true,
            profile: userProfile,
          };
        } catch (error) {
          log.error("SAML IdP authentication error", { error: safeStringify(error) });
          return null;
        }
      },
    })
  );
}

providers.push(
  EmailProvider({
    type: "email",
    maxAge: 10 * 60 * 60, // Magic links are valid for 10 min only
    sendVerificationRequest: async (props) => (await import("./sendVerificationRequest")).default(props),
  })
);

function isNumber(n: string) {
  return !isNaN(parseFloat(n)) && !isNaN(+n);
}

const calcomAdapter = CalComAdapter(prisma);

const mapIdentityProvider = (providerName: string) => {
  switch (providerName) {
    case "saml-idp":
    case "saml":
      return IdentityProvider.SAML;
    default:
      return IdentityProvider.GOOGLE;
  }
};

export const getOptions = ({
  cookies,
  res,
  req,
}: {
  /** so we can extract the required cookie in both pages and app routers */
  cookies: Partial<{
    dub_id?: string;
    utm_params?: string;
    device_details?: string;
    last_active_throttle?: string;
  }>;
  res?: any;
  req?: any;
}): AuthOptions => ({
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  adapter: calcomAdapter,
  session: {
    strategy: "jwt",
  },
  jwt: {
    // decorate the native JWT encode function
    encode: async ({ token, maxAge, secret }) => {
      log.debug("jwt:encode", safeStringify({ tokenSub: token?.sub, maxAge }));
      if (token?.sub && isNumber(token.sub)) {
        try {
          const user = await prisma.user.findFirst({
            where: { id: Number(token.sub) },
            select: { metadata: true },
          });

          if (user) {
            const metadata = userMetadata.parse(user.metadata);
            if (metadata?.sessionTimeout) {
              maxAge = metadata.sessionTimeout * 60;
              log.debug("Custom session timeout applied", { userId: token.sub, maxAge });
            }
          }
        } catch (error) {
          log.error("Error fetching user session timeout", { error: safeStringify(error) });
          // Continue with default maxAge
        }
      }
      return encode({ secret, token, maxAge });
    },
  },
  cookies: defaultCookies(WEBAPP_URL?.startsWith("https://")),
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
  },
  providers,
  callbacks: {
    async jwt({ token, trigger, session, user, account }) {
      log.debug(
        "callbacks:jwt",
        safeStringify({ tokenEmail: token?.email, trigger, hasUser: !!user, hasAccount: !!account })
      );

      if (token.id && !cookies.last_active_throttle && res) {
        waitUntil(new UsersRepository().updateLastActiveAt(token.id as number));
        const useSecureCookies = WEBAPP_URL?.startsWith("https://");
        const cookieValue = serialize("last_active_throttle", "1", {
          httpOnly: true,
          sameSite: "lax",
          secure: useSecureCookies,
          path: "/",
          maxAge: 12 * 60 * 60,
        });
        const existing = res.getHeader("Set-Cookie");
        if (existing) {
          res.setHeader(
            "Set-Cookie",
            Array.isArray(existing) ? [...existing, cookieValue] : [existing, cookieValue]
          );
        } else {
          res.setHeader("Set-Cookie", [cookieValue]);
        }
      }

      // Handle session updates
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

      const autoMergeIdentities = async () => {
        const existingUser = await prisma.user.findFirst({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
                team: true,
              },
            },
            timeZone: true,
            createdDate: true,
            completedOnboarding: true,
            bannerUrl: true,
            emailVerified: true,
          },
        });

        if (!existingUser) {
          log.debug("No existing user found for auto-merge", { email: token.email });
          return token;
        }

        const belongsToActiveTeam = checkIfUserBelongsToActiveTeam(existingUser);
        const { teams: _teams, ...existingUserWithoutTeamsField } = existingUser;
        const allProfiles = await ProfileRepository.findAllProfilesForUserIncludingMovedUser(existingUser);

        const { upId } = determineProfile({ profiles: allProfiles, token });
        const profile = await ProfileRepository.findByUpId(upId);

        if (!profile) {
          log.error("Profile not found for upId", { upId });
          throw new Error("Profile not found");
        }

        const profileOrg = profile?.organization;
        let orgRole: MembershipRole | undefined;

        if (profileOrg) {
          const membership = await prisma.membership.findUnique({
            where: {
              userId_teamId: {
                teamId: profileOrg.id,
                userId: existingUser.id,
              },
            },
          });
          orgRole = membership?.role;
        }

        log.info("Auto-merge identities successful", { userId: existingUser.id });

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
      };

      if (!user) {
        return await autoMergeIdentities();
      }

      if (!account) {
        return token;
      }

      // Handle credentials-based authentication
      if (account.type === "credentials") {
        log.debug("JWT callback: credentials auth", { provider: account.provider });

        if (account.provider === "saml-idp") {
          return { ...token, upId: user.profile?.upId ?? token.upId ?? null } as JWT;
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
          timeZone: user.timeZone,
          createdDate: user.createdDate,
          completedOnboarding: user.completedOnboarding,
          customBrandingEnabled: !!user.bannerUrl,
          emailVerified: user.emailVerified,
          avatarUrl: user.avatarUrl,
        } as JWT;
      }

      // Handle OAuth authentication
      if (account.type === "oauth") {
        log.debug("JWT callback: OAuth auth", { provider: account.provider });

        if (!account.provider || !account.providerAccountId) {
          log.warn("OAuth account missing provider or providerAccountId");
          return { ...token, upId: user.profile?.upId ?? token.upId ?? null } as JWT;
        }

        const idP = account.provider === "saml" ? IdentityProvider.SAML : IdentityProvider.GOOGLE;

        const existingUser = await prisma.user.findFirst({
          where: {
            AND: [{ identityProvider: idP }, { identityProviderId: account.providerAccountId }],
          },
        });

        if (!existingUser) {
          return await autoMergeIdentities();
        }

        // Install Google Calendar integration if applicable
        const grantedScopes = account.scope?.split(" ") ?? [];
        if (
          account.provider === "google" &&
          !(await CredentialRepository.findFirstByAppIdAndUserId({
            userId: user.id as number,
            appId: "google-calendar",
          })) &&
          GOOGLE_CALENDAR_SCOPES.every((scope) => grantedScopes.includes(scope))
        ) {
          try {
            log.info("Installing Google Calendar for user", { userId: user.id });

            const credentialkey = {
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              id_token: account.id_token,
              token_type: account.token_type,
              expires_at: account.expires_at,
            };

            const gcalCredential = await CredentialRepository.create({
              userId: user.id as number,
              key: credentialkey,
              appId: "google-calendar",
              type: "google_calendar",
            });

            const gCalService = new GoogleCalendarService({
              ...gcalCredential,
              user: null,
              delegatedTo: null,
            });

            if (
              !(await CredentialRepository.findFirstByUserIdAndType({
                userId: user.id as number,
                type: "google_video",
              }))
            ) {
              await CredentialRepository.create({
                type: "google_video",
                key: {},
                userId: user.id as number,
                appId: "google-meet",
              });
            }

            const oAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
            oAuth2Client.setCredentials(credentialkey);
            const calendar = new calendar_v3.Calendar({ auth: oAuth2Client });

            const primaryCal = await gCalService.getPrimaryCalendar(calendar);
            if (primaryCal?.id) {
              await gCalService.createSelectedCalendar({
                externalId: primaryCal.id,
                userId: user.id as number,
              });
            }

            await updateProfilePhotoGoogle(oAuth2Client, user.id as number);
            log.info("Google Calendar installation completed", { userId: user.id });
          } catch (error) {
            log.error("Failed to install Google Calendar", { userId: user.id, error: safeStringify(error) });
            // Non-fatal: user can still log in
          }
        }

        const allProfiles = await ProfileRepository.findAllProfilesForUserIncludingMovedUser(existingUser);
        const { upId } = determineProfile({ profiles: allProfiles, token });

        log.info("OAuth authentication successful", { userId: existingUser.id });

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
          timeZone: existingUser.timeZone,
          createdDate: existingUser.createdDate,
          completedOnboarding: existingUser.completedOnboarding,
          customBrandingEnabled: !!existingUser.bannerUrl,
          emailVerified: existingUser.emailVerified,
          avatarUrl: existingUser.avatarUrl,
        } as JWT;
      }

      // Handle email-based authentication
      if (account.type === "email") {
        return await autoMergeIdentities();
      }

      log.warn("Unknown account type in JWT callback", {
        accountType: account.type,
        accountProvider: account.provider,
      });
      return token;
    },

    async session({ session, token, user }) {
      log.debug(
        "callbacks:session",
        safeStringify({ sessionEmail: session?.user?.email, tokenId: token?.id })
      );

      try {
        const deploymentRepo = new DeploymentRepository(prisma);
        const licenseKeyService = await LicenseKeySingleton.getInstance(deploymentRepo);
        const hasValidLicense = await licenseKeyService.checkLicense();
        const profileId = token.profileId;

        const calendsoSession: Session = {
          ...session,
          profileId,
          upId: token.upId || session.upId,
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
            timeZone: token.timeZone,
            createdDate: token.createdDate,
            completedOnboarding: token.completedOnboarding,
            customBrandingEnabled: !!token.customBrandingEnabled,
            emailVerified: token.emailVerified,
            avatarUrl: token.avatarUrl,
          },
        };

        return calendsoSession;
      } catch (error) {
        log.error("Error in session callback", { error: safeStringify(error) });
        // Return a minimal valid session to prevent auth failure
        return session;
      }
    },

    async signIn(params) {
      const { user, profile, account } = params;
      log.debug("callbacks:signin", safeStringify({ email: user?.email, provider: account?.provider }));

      try {
        // Email provider always allowed
        if (account?.provider === "email") {
          return true;
        }

        // Credentials provider (except SAML IdP)
        if (account?.provider !== "saml-idp" && account?.type === "credentials") {
          try {
            if (account?.provider === "google-one-tap" && user?.id) {
              const dbUser = await prisma.user.findFirst({
                where: { id: user.id as number },
                select: { metadata: true },
              });
              const existingMetadata =
                (isPrismaObjOrUndefined(dbUser?.metadata) as Record<string, unknown>) ?? {};
              await updateUserUTMIfNeeded(
                user.id as number,
                existingMetadata,
                IdentityProvider.GOOGLE,
                cookies?.utm_params
              );
            }
          } catch {
            log.error("Error updating UTM for Google One Tap user", { userId: user?.id });
          }
          return true;
        }

        // Validate OAuth/SAML requirements
        if (account?.type !== "oauth" && account?.provider !== "saml-idp") {
          log.warn("Invalid account type in signIn", { type: account?.type, provider: account?.provider });
          return false;
        }

        if (!user.email || !user.name) {
          log.warn("OAuth/SAML user missing required fields", {
            hasEmail: !!user.email,
            hasName: !!user.name,
          });
          return false;
        }

        if (!account?.provider) {
          log.warn("Account missing provider in signIn");
          return false;
        }

        const idP: IdentityProvider = mapIdentityProvider(account.provider);

        // FIXED: Strict email verification check with proper error handling
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-error TODO validate email_verified key on profile
        const isEmailVerified = user.email_verified || !!user.emailVerified || profile?.email_verified;

        if (!isEmailVerified) {
          log.error("Unverified email in OAuth/SAML login", {
            email: user.email,
            provider: account.provider,
          });
          // FIXED: Throw error instead of returning redirect string
          throw new Error("unverified-email");
        }

        // Check for existing user with this identity provider
        let existingUser = await prisma.user.findFirst({
          include: {
            accounts: {
              where: { provider: account.provider },
            },
          },
          where: {
            identityProvider: idP,
            identityProviderId: account.providerAccountId,
          },
        });

        // Fix legacy issue where identityProviderId was set to userId
        if (!existingUser) {
          existingUser = await prisma.user.findFirst({
            include: {
              accounts: {
                where: { provider: account.provider },
              },
            },
            where: {
              identityProvider: idP,
              identityProviderId: String(user.id),
            },
          });

          if (existingUser) {
            log.info("Fixing legacy identityProviderId", { userId: existingUser.id });
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { identityProviderId: account.providerAccountId },
            });
          }
        }

        if (existingUser?.locked) {
          return "/auth/locked";
        }
        // Existing user found
        if (existingUser) {
          // Email hasn't changed
          if (existingUser.email === user.email) {
            await linkOAuthAccountIfNeeded(existingUser, account, user.email);

            // Update UTM if needed
            const existingMetadata =
              (isPrismaObjOrUndefined(existingUser.metadata) as Record<string, unknown>) ?? {};
            await updateUserUTMIfNeeded(existingUser.id, existingMetadata, idP, cookies?.utm_params);
            await updateUserDeviceDetailsIfNeeded(
              existingUser.id,
              existingMetadata,
              idP,
              cookies?.device_details,
              req
            );

            // Check for 2FA requirement
            if (existingUser.twoFactorEnabled && existingUser.identityProvider === idP) {
              const totpUrl = await loginWithTotp(existingUser.email);
              log.info("Redirecting to TOTP login", { userId: existingUser.id });
              return totpUrl;
            }

            log.info("Existing user login successful", { userId: existingUser.id });
            return true;
          }

          // Email has changed - check if new email is available
          const userWithNewEmail = await prisma.user.findFirst({
            where: { email: user.email },
          });

          if (!userWithNewEmail) {
            log.info("Updating user email", {
              userId: existingUser.id,
              oldEmail: existingUser.email,
              newEmail: user.email,
            });

            const existingMetadata =
              (isPrismaObjOrUndefined(existingUser.metadata) as Record<string, unknown>) ?? {};
            const utm = !existingMetadata.utm ? await fetchUTMfromCookies(idP, cookies?.utm_params) : null;

            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                email: user.email,
                ...(utm && {
                  metadata: {
                    ...existingMetadata,
                    utm,
                  },
                }),
              },
            });

            if (existingUser.twoFactorEnabled) {
              return await loginWithTotp(user.email);
            }
            return true;
          } else {
            log.warn("Email change conflict", { userId: existingUser.id, conflictEmail: user.email });
            throw new Error("new-email-conflict");
          }
        }

        // No existing user - check if email is already registered
        const existingUserWithEmail = await prisma.user.findFirst({
          where: {
            email: {
              equals: user.email,
              mode: "insensitive",
            },
          },
          include: {
            password: true,
          },
        });

        if (existingUserWithEmail) {
          const existingMetadata =
            (isPrismaObjOrUndefined(existingUserWithEmail.metadata) as Record<string, unknown>) ?? {};

          // Self-hosted: allow auto-merge for verified non-CAL users
          if (
            !hostedCal &&
            existingUserWithEmail.emailVerified &&
            existingUserWithEmail.identityProvider !== IdentityProvider.CAL
          ) {
            log.info("Self-hosted auto-merge", { userId: existingUserWithEmail.id, newIdP: idP });

            await updateUserUTMIfNeeded(existingUserWithEmail.id, existingMetadata, idP, cookies?.utm_params);
            await updateUserDeviceDetailsIfNeeded(
              existingUserWithEmail.id,
              existingMetadata,
              idP,
              cookies?.device_details,
              req
            );

            if (existingUserWithEmail.twoFactorEnabled) {
              return await loginWithTotp(existingUserWithEmail.email);
            }
            return true;
          }

          // Handle invited users (no password, not verified, no username)
          if (
            !existingUserWithEmail.password?.hash &&
            !existingUserWithEmail.emailVerified &&
            !existingUserWithEmail.username
          ) {
            log.info("Completing invited user signup", { userId: existingUserWithEmail.id });

            const { existingUserWithUsername, username: _username } = await checkIfUserNameTaken({
              name: user.name,
            });
            const username = existingUserWithUsername ? usernameSlugRandom(user.name) : _username;
            const utm = await fetchUTMfromCookies(idP, cookies?.utm_params);
            const deviceDetailsFromCookie =
              idP === IdentityProvider.GOOGLE
                ? await fetchDeviceDetailsFromCookies(idP, cookies?.device_details)
                : null;

            // Process device details with IP (Google only)
            let deviceDetails = null;
            if (deviceDetailsFromCookie && idP === IdentityProvider.GOOGLE) {
              try {
                const ip = req ? getIP(req) : "Unknown";
                deviceDetails = {
                  ip: ip || "Unknown",
                  browser: sanitizeDeviceString(deviceDetailsFromCookie.browser),
                  deviceType: deviceDetailsFromCookie.deviceType,
                  deviceOS: sanitizeDeviceString(deviceDetailsFromCookie.deviceOS),
                  screenResolution: sanitizeDeviceString(deviceDetailsFromCookie.screenResolution),
                };
              } catch (error) {
                log.error("Failed to process device details for invited user", { error });
              }
            }

            await prisma.user.update({
              where: { email: existingUserWithEmail.email },
              data: {
                email: user.email,
                username,
                emailVerified: new Date(Date.now()),
                name: user.name,
                identityProvider: idP,
                identityProviderId: account.providerAccountId,
                ...((utm || deviceDetails) && {
                  metadata: {
                    ...((isPrismaObjOrUndefined(existingUserWithEmail.metadata) as object) ?? {}),
                    ...(utm && { utm }),
                    ...(deviceDetails && { deviceDetails }),
                  },
                }),
              },
            });

            // Notify via webhook
            await sendUserToMakeWebhook({
              id: existingUserWithEmail.id,
              email: user.email,
              name: user.name,
              username,
              identityProvider: idP,
              createdAt: existingUserWithEmail.createdDate,
            });

            if (existingUserWithEmail.twoFactorEnabled) {
              return await loginWithTotp(user.email);
            }
            return true;
          }

          // CAL user signing in with Google/SAML - migrate identity provider
          if (
            existingUserWithEmail.identityProvider === IdentityProvider.CAL &&
            (idP === IdentityProvider.GOOGLE || idP === IdentityProvider.SAML)
          ) {
            log.info("Migrating CAL user to OAuth/SAML", { userId: existingUserWithEmail.id, newIdP: idP });

            const utm = await fetchUTMfromCookies(idP, cookies?.utm_params);
            const deviceDetailsFromCookie =
              idP === IdentityProvider.GOOGLE
                ? await fetchDeviceDetailsFromCookies(idP, cookies?.device_details)
                : null;

            // Process device details with IP (Google only)
            let deviceDetails = null;
            if (
              deviceDetailsFromCookie &&
              !existingMetadata.deviceDetails &&
              idP === IdentityProvider.GOOGLE
            ) {
              try {
                const ip = req ? getIP(req) : "Unknown";
                deviceDetails = {
                  ip: ip || "Unknown",
                  browser: sanitizeDeviceString(deviceDetailsFromCookie.browser),
                  deviceType: deviceDetailsFromCookie.deviceType,
                  deviceOS: sanitizeDeviceString(deviceDetailsFromCookie.deviceOS),
                  screenResolution: sanitizeDeviceString(deviceDetailsFromCookie.screenResolution),
                };
              } catch (error) {
                log.error("Failed to process device details for CAL migration", { error });
              }
            }

            await prisma.user.update({
              where: { email: existingUserWithEmail.email },
              data: {
                email: user.email.toLowerCase(),
                identityProvider: idP,
                identityProviderId: account.providerAccountId,
                ...((utm && !existingMetadata.utm) || deviceDetails
                  ? {
                      metadata: {
                        ...existingMetadata,
                        ...(utm && !existingMetadata.utm && { utm }),
                        ...(deviceDetails && { deviceDetails }),
                      },
                    }
                  : {}),
              },
            });

            if (existingUserWithEmail.twoFactorEnabled) {
              return await loginWithTotp(user.email);
            }
            return true;
          }

          // Google user migrating to SAML
          if (
            existingUserWithEmail.identityProvider === IdentityProvider.GOOGLE &&
            idP === IdentityProvider.SAML
          ) {
            log.info("Migrating Google user to SAML", { userId: existingUserWithEmail.id });

            const utm = await fetchUTMfromCookies(idP, cookies?.utm_params);
            // No device details for SAML

            await prisma.user.update({
              where: { email: existingUserWithEmail.email },
              data: {
                email: user.email.toLowerCase(),
                identityProvider: idP,
                identityProviderId: account.providerAccountId,
                ...(utm &&
                  !existingMetadata.utm && {
                    metadata: {
                      ...existingMetadata,
                      utm,
                    },
                  }),
              },
            });

            if (existingUserWithEmail.twoFactorEnabled) {
              return await loginWithTotp(user.email);
            }
            return true;
          }

          // Wrong provider error
          log.warn("Provider mismatch", {
            email: user.email,
            existingProvider: existingUserWithEmail.identityProvider,
            attemptedProvider: idP,
          });
          throw new Error(`wrong-provider&provider=${existingUserWithEmail.identityProvider}`);
        }

        // Create new user
        try {
          log.info("Creating new OAuth/SAML user", { email: user.email, provider: idP });

          const { orgUsername, orgId } = await checkIfUserShouldBelongToOrg(idP, user.email);
          const { existingUserWithUsername, username: _username } = await checkIfUserNameTaken({
            name: user.name,
          });
          const username = orgId
            ? slugify(orgUsername)
            : existingUserWithUsername
            ? usernameSlugRandom(user.name)
            : _username;
          const utm = await fetchUTMfromCookies(idP, cookies?.utm_params);
          const deviceDetailsFromCookie =
            idP === IdentityProvider.GOOGLE
              ? await fetchDeviceDetailsFromCookies(idP, cookies?.device_details)
              : null;

          // Process device details with IP (Google only)
          let deviceDetails = null;
          if (deviceDetailsFromCookie && idP === IdentityProvider.GOOGLE) {
            try {
              const ip = req ? getIP(req) : "Unknown";
              deviceDetails = {
                ip: ip || "Unknown",
                browser: sanitizeDeviceString(deviceDetailsFromCookie.browser),
                deviceType: deviceDetailsFromCookie.deviceType,
                deviceOS: sanitizeDeviceString(deviceDetailsFromCookie.deviceOS),
                screenResolution: sanitizeDeviceString(deviceDetailsFromCookie.screenResolution),
              };
            } catch (error) {
              log.error("Failed to process device details for new user", { error });
            }
          }

          const newUser = await prisma.user.create({
            data: {
              username,
              emailVerified: new Date(Date.now()),
              name: user.name,
              ...(user.image && { avatarUrl: user.image }),
              email: user.email,
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
              ...((utm || deviceDetails) && {
                metadata: {
                  ...(utm && { utm }),
                  ...(deviceDetails && { deviceDetails }),
                },
              }),
            },
          });

          const linkAccountNewUserData = {
            ...account,
            userId: newUser.id,
            providerEmail: user.email,
          };
          await calcomAdapter.linkAccount(linkAccountNewUserData);

          // Notify via webhook
          await sendUserToMakeWebhook({
            id: newUser.id,
            email: newUser.email,
            name: newUser.name || "",
            username: newUser.username || "",
            identityProvider: idP,
            createdAt: newUser.createdDate,
          });

          log.info("New user created successfully", { userId: newUser.id });

          if (account.twoFactorEnabled) {
            return await loginWithTotp(newUser.email);
          }
          return true;
        } catch (err) {
          log.error("User creation failed", { email: user.email, error: safeStringify(err) });
          throw new Error("user-creation-error");
        }
      } catch (error) {
        // FIXED: Proper error handling with redirect URLs
        if (error instanceof Error) {
          log.error("SignIn callback error", { message: error.message, error: safeStringify(error) });
          return `/auth/error?error=${error.message}`;
        }
        log.error("Unknown signIn callback error", { error: safeStringify(error) });
        return "/auth/error?error=unknown";
      }
    },

    async redirect({ url, baseUrl }) {
      try {
        const parsedUrl = new URL(url);
        const parsedBase = new URL(baseUrl);

        // Normalize host by removing "app." prefix
        const normalizeHost = (host: string): string => host.replace(/^app\./, "");
        const isSameDomain = normalizeHost(parsedUrl.hostname) === normalizeHost(parsedBase.hostname);
        const isRootPath = ["/", ""].includes(parsedUrl.pathname);
        const isLoginPath = parsedUrl.pathname.includes("/auth/login");

        // Root domain or login page → redirect to /home
        if (isSameDomain && (isRootPath || isLoginPath)) {
          log.debug("Redirecting to /home", { from: parsedUrl.pathname });
          return `${baseUrl}/home`;
        }

        // Internal relative path → prefix with baseUrl
        if (url.startsWith("/")) {
          return `${baseUrl}${url}`;
        }

        // External or fully-qualified URL → use as-is
        return url;
      } catch (error) {
        log.error("Redirect error", { url, baseUrl, error: safeStringify(error) });
        return baseUrl;
      }
    },
  },

  events: {
    async signIn(message) {
      const user = message.user as User & {
        username: string;
        createdDate: string;
      };

      try {
        // Set secure cookie for logged in user
        const useSecureCookies = WEBAPP_URL?.startsWith("https://");
        if (res && message?.user?.id) {
          res.setHeader("Set-Cookie", [
            `loggedInUserId=${message.user.id}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax${
              useSecureCookies ? "; Secure" : ""
            }`,
          ]);
          log.debug("Set loggedInUserId cookie", { userId: message.user.id });
        }

        // Track new user signups with Dub
        const isNewUser = new Date(user.createdDate) > new Date(Date.now() - 10 * 60 * 1000);
        if ((isENVDev || IS_CALCOM) && isNewUser && process.env.DUB_API_KEY) {
          const clickId = cookies.dub_id;
          if (clickId) {
            log.info("Tracking signup with Dub", { userId: user.id });
            waitUntil(
              dub.track.lead({
                clickId,
                eventName: "Sign Up",
                externalId: user.id.toString(),
                customerName: user.name,
                customerEmail: user.email,
                customerAvatar: user.image,
              })
            );
          }
        }
      } catch (error) {
        log.error("Error in signIn event handler", { userId: user?.id, error: safeStringify(error) });
        // Non-fatal: don't block sign in
      }
    },
  },
});

/**
 * Identifies the profile the user should be logged into.
 */
const determineProfile = ({
  token,
  profiles,
}: {
  token: JWT;
  profiles: { id: number | null; upId: string }[];
}) => {
  // If profile switcher is disabled, use the first profile
  if (!ENABLE_PROFILE_SWITCHER) {
    return profiles[0];
  }

  // Use token profile if available
  if (token.upId) {
    return { profileId: token.profileId, upId: token.upId as string };
  }

  // Default to first profile
  return profiles[0];
};
