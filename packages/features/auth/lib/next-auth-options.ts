import type { Membership, Team, UserPermissionRole } from "@prisma/client";
import type { AuthOptions, Session } from "next-auth";
import { encode } from "next-auth/jwt";
import type { Provider } from "next-auth/providers";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";

import checkLicense from "@calcom/features/ee/common/server/checkLicense";
import ImpersonationProvider from "@calcom/features/ee/impersonation/lib/ImpersonationProvider";
import { getOrgFullOrigin, subdomainSuffix } from "@calcom/features/ee/organizations/lib/orgDomains";
import { clientSecretVerifier, hostedCal, isSAMLLoginEnabled } from "@calcom/features/ee/sso/lib/saml";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { symmetricDecrypt, symmetricEncrypt } from "@calcom/lib/crypto";
import { defaultCookies } from "@calcom/lib/default-cookies";
import { isENVDev } from "@calcom/lib/env";
import { randomString } from "@calcom/lib/random";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { IdentityProvider, MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema, userMetadata } from "@calcom/prisma/zod-utils";

import { ErrorCode } from "./ErrorCode";
import { isPasswordValid } from "./isPasswordValid";
import CalComAdapter from "./next-auth-custom-adapter";
import { verifyPassword } from "./verifyPassword";

const GOOGLE_API_CREDENTIALS = process.env.GOOGLE_API_CREDENTIALS || "{}";
const { client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET } =
  JSON.parse(GOOGLE_API_CREDENTIALS)?.web || {};
const GOOGLE_LOGIN_ENABLED = process.env.GOOGLE_LOGIN_ENABLED === "true";
const IS_GOOGLE_LOGIN_ENABLED = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_LOGIN_ENABLED);
const ORGANIZATIONS_AUTOLINK =
  process.env.ORGANIZATIONS_AUTOLINK === "1" || process.env.ORGANIZATIONS_AUTOLINK === "true";

const usernameSlug = (username: string) => `${slugify(username)}-${randomString(6).toLowerCase()}`;

const loginWithTotp = async (user: { email: string }) =>
  `/auth/login?totp=${await (await import("./signJwt")).default({ email: user.email })}`;

type UserTeams = {
  teams: (Membership & {
    team: Team;
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
      AND: [
        {
          metadata: {
            path: ["isOrganizationVerified"],
            equals: true,
          },
        },
        {
          metadata: {
            path: ["orgAutoAcceptEmail"],
            equals: apexDomain,
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });
  return { orgUsername, orgId: existingOrg?.id };
};

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
      if (!credentials) {
        console.error(`For some reason credentials are missing`);
        throw new Error(ErrorCode.InternalServerError);
      }

      const user = await prisma.user.findUnique({
        where: {
          email: credentials.email.toLowerCase(),
        },
        select: {
          locked: true,
          role: true,
          id: true,
          username: true,
          name: true,
          email: true,
          metadata: true,
          identityProvider: true,
          password: true,
          organizationId: true,
          twoFactorEnabled: true,
          twoFactorSecret: true,
          backupCodes: true,
          locale: true,
          organization: {
            select: {
              id: true,
            },
          },
          teams: {
            include: {
              team: true,
            },
          },
        },
      });

      // Don't leak information about it being username or password that is invalid
      if (!user) {
        throw new Error(ErrorCode.IncorrectEmailPassword);
      }

      // Locked users cannot login
      if (user.locked) {
        throw new Error(ErrorCode.UserAccountLocked);
      }

      await checkRateLimitAndThrowError({
        identifier: user.email,
      });

      if (user.identityProvider !== IdentityProvider.CAL && !credentials.totpCode) {
        throw new Error(ErrorCode.ThirdPartyIdentityProviderEnabled);
      }
      if (!user.password && user.identityProvider == IdentityProvider.CAL) {
        throw new Error(ErrorCode.IncorrectEmailPassword);
      }
      if (!user.password && user.identityProvider !== IdentityProvider.CAL && !credentials.totpCode) {
        throw new Error(ErrorCode.IncorrectEmailPassword);
      }

      if (user.password && !credentials.totpCode) {
        if (!user.password) {
          throw new Error(ErrorCode.IncorrectEmailPassword);
        }
        const isCorrectPassword = await verifyPassword(credentials.password, user.password);
        if (!isCorrectPassword) {
          throw new Error(ErrorCode.IncorrectEmailPassword);
        }
      }

      if (user.twoFactorEnabled && credentials.backupCode) {
        if (!process.env.CALENDSO_ENCRYPTION_KEY) {
          console.error("Missing encryption key; cannot proceed with backup code login.");
          throw new Error(ErrorCode.InternalServerError);
        }

        if (!user.backupCodes) throw new Error(ErrorCode.MissingBackupCodes);

        const backupCodes = JSON.parse(
          symmetricDecrypt(user.backupCodes, process.env.CALENDSO_ENCRYPTION_KEY)
        );

        // check if user-supplied code matches one
        const index = backupCodes.indexOf(credentials.backupCode.replaceAll("-", ""));
        if (index === -1) throw new Error(ErrorCode.IncorrectBackupCode);

        // delete verified backup code and re-encrypt remaining
        backupCodes[index] = null;
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            backupCodes: symmetricEncrypt(JSON.stringify(backupCodes), process.env.CALENDSO_ENCRYPTION_KEY),
          },
        });
      } else if (user.twoFactorEnabled) {
        if (!credentials.totpCode) {
          throw new Error(ErrorCode.SecondFactorRequired);
        }

        if (!user.twoFactorSecret) {
          console.error(`Two factor is enabled for user ${user.id} but they have no secret`);
          throw new Error(ErrorCode.InternalServerError);
        }

        if (!process.env.CALENDSO_ENCRYPTION_KEY) {
          console.error(`"Missing encryption key; cannot proceed with two factor login."`);
          throw new Error(ErrorCode.InternalServerError);
        }

        const secret = symmetricDecrypt(user.twoFactorSecret, process.env.CALENDSO_ENCRYPTION_KEY);
        if (secret.length !== 32) {
          console.error(
            `Two factor secret decryption failed. Expected key with length 32 but got ${secret.length}`
          );
          throw new Error(ErrorCode.InternalServerError);
        }

        const isValidToken = (await import("@calcom/lib/totp")).totpAuthenticatorCheck(
          credentials.totpCode,
          secret
        );
        if (!isValidToken) {
          throw new Error(ErrorCode.IncorrectTwoFactorCode);
        }
      }
      // Check if the user you are logging into has any active teams
      const hasActiveTeams = checkIfUserBelongsToActiveTeam(user);

      // authentication success- but does it meet the minimum password requirements?
      const validateRole = (role: UserPermissionRole) => {
        // User's role is not "ADMIN"
        if (role !== "ADMIN") return role;
        // User's identity provider is not "CAL"
        if (user.identityProvider !== IdentityProvider.CAL) return role;

        if (process.env.NEXT_PUBLIC_IS_E2E) {
          console.warn("E2E testing is enabled, skipping password and 2FA requirements for Admin");
          return role;
        }

        // User's password is valid and two-factor authentication is enabled
        if (isPasswordValid(credentials.password, false, true) && user.twoFactorEnabled) return role;
        // Code is running in a development environment
        if (isENVDev) return role;
        // By this point it is an ADMIN without valid security conditions
        return "INACTIVE_ADMIN";
      };

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: validateRole(user.role),
        belongsToActiveTeam: hasActiveTeams,
        organizationId: user.organizationId,
        locale: user.locale,
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
    profile: (profile) => {
      return {
        id: profile.id || "",
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        name: `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
        email_verified: true,
        locale: profile.locale,
      };
    },
    options: {
      clientId: "dummy",
      clientSecret: clientSecretVerifier,
    },
    allowDangerousEmailAccountLinking: true,
  });

  // Idp initiated login
  providers.push(
    CredentialsProvider({
      id: "saml-idp",
      name: "IdP Login",
      credentials: {
        code: {},
      },
      async authorize(credentials) {
        if (!credentials) {
          return null;
        }

        const { code } = credentials;

        if (!code) {
          return null;
        }

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
          return null;
        }

        // Fetch user info
        const userInfo = await oauthController.userInfo(access_token);

        if (!userInfo) {
          return null;
        }

        const { id, firstName, lastName, email } = userInfo;

        return {
          id: id as unknown as number,
          firstName,
          lastName,
          email,
          name: `${firstName} ${lastName}`.trim(),
          email_verified: true,
        };
      },
    })
  );
}

providers.push(
  EmailProvider({
    type: "email",
    maxAge: 10 * 60 * 60, // Magic links are valid for 10 min only
    // Here we setup the sendVerificationRequest that calls the email template with the identifier (email) and token to verify.
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

export const AUTH_OPTIONS: AuthOptions = {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  adapter: calcomAdapter,
  session: {
    strategy: "jwt",
  },
  jwt: {
    // decorate the native JWT encode function
    // Impl. detail: We don't pass through as this function is called with encode/decode functions.
    encode: async ({ token, maxAge, secret }) => {
      if (token?.sub && isNumber(token.sub)) {
        const user = await prisma.user.findFirst({
          where: { id: Number(token.sub) },
          select: { metadata: true },
        });
        // if no user is found, we still don't want to crash here.
        if (user) {
          const metadata = userMetadata.parse(user.metadata);
          if (metadata?.sessionTimeout) {
            maxAge = metadata.sessionTimeout * 60;
          }
        }
      }
      return encode({ secret, token, maxAge });
    },
  },
  cookies: defaultCookies(),
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error", // Error code passed in query string as ?error=
    verifyRequest: "/auth/verify",
    // newUser: "/auth/new", // New users will be directed here on first sign in (leave the property out if not of interest)
  },
  providers,
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (trigger === "update") {
        return {
          ...token,
          locale: session?.locale ?? token.locale ?? "en",
          name: session?.name ?? token.name,
          username: session?.username ?? token.username,
          email: session?.email ?? token.email,
        };
      }
      const autoMergeIdentities = async () => {
        const existingUser = await prisma.user.findFirst({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          where: { email: token.email! },
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                metadata: true,
              },
            },
            role: true,
            locale: true,
            teams: {
              include: {
                team: true,
              },
            },
          },
        });

        if (!existingUser) {
          return token;
        }

        // Check if the existingUser has any active teams
        const belongsToActiveTeam = checkIfUserBelongsToActiveTeam(existingUser);
        const { teams: _teams, organization, ...existingUserWithoutTeamsField } = existingUser;

        const parsedOrgMetadata = teamMetadataSchema.parse(organization?.metadata ?? {});

        return {
          ...existingUserWithoutTeamsField,
          ...token,
          belongsToActiveTeam,
          org: organization
            ? {
                id: organization.id,
                name: organization.name,
                slug: organization.slug ?? parsedOrgMetadata?.requestedSlug ?? "",
                fullDomain: getOrgFullOrigin(organization.slug ?? parsedOrgMetadata?.requestedSlug ?? ""),
                domainSuffix: subdomainSuffix(),
              }
            : undefined,
        };
      };
      if (!user) {
        return await autoMergeIdentities();
      }
      if (!account) {
        return token;
      }
      if (account.type === "credentials") {
        // return token if credentials,saml-idp
        if (account.provider === "saml-idp") {
          return token;
        }
        // any other credentials, add user info
        return {
          ...token,
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          impersonatedBy: user.impersonatedBy,
          belongsToActiveTeam: user?.belongsToActiveTeam,
          org: user?.org,
          locale: user?.locale,
        };
      }

      // The arguments above are from the provider so we need to look up the
      // user based on those values in order to construct a JWT.
      if (account.type === "oauth") {
        if (!account.provider || !account.providerAccountId) {
          return token;
        }
        const idP = account.provider === "saml" ? IdentityProvider.SAML : IdentityProvider.GOOGLE;

        const existingUser = await prisma.user.findFirst({
          where: {
            AND: [
              {
                identityProvider: idP,
              },
              {
                identityProviderId: account.providerAccountId,
              },
            ],
          },
        });

        if (!existingUser) {
          return await autoMergeIdentities();
        }

        return {
          ...token,
          id: existingUser.id,
          name: existingUser.name,
          username: existingUser.username,
          email: existingUser.email,
          role: existingUser.role,
          impersonatedBy: token.impersonatedBy,
          belongsToActiveTeam: token?.belongsToActiveTeam as boolean,
          org: token?.org,
          locale: existingUser.locale,
        };
      }

      return token;
    },
    async session({ session, token }) {
      const hasValidLicense = await checkLicense(prisma);
      const calendsoSession: Session = {
        ...session,
        hasValidLicense,
        user: {
          ...session.user,
          id: token.id as number,
          name: token.name,
          username: token.username as string,
          role: token.role as UserPermissionRole,
          impersonatedBy: token.impersonatedBy,
          belongsToActiveTeam: token?.belongsToActiveTeam as boolean,
          org: token?.org,
          locale: token.locale,
          currentWorkspace: (token as any).user.currentWorkspace,
          funnelhubId: (token as any).user.id,
          funnelhubToken: (token as any).user.apiToken,
        },
      };
      return calendsoSession;
    },
    async signIn(params) {
      const { user, account, profile } = params;

      if (account?.provider === "email") {
        return true;
      }

      // In this case we've already verified the credentials in the authorize
      // callback so we can sign the user in.
      // Only if provider is not saml-idp
      if (account?.provider !== "saml-idp") {
        if (account?.type === "credentials") {
          return true;
        }

        if (account?.type !== "oauth") {
          return false;
        }
      }

      if (!user.email) {
        return false;
      }

      if (!user.name) {
        return false;
      }

      if (account?.provider) {
        const idP: IdentityProvider = mapIdentityProvider(account.provider);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-error TODO validate email_verified key on profile
        user.email_verified = user.email_verified || !!user.emailVerified || profile.email_verified;

        if (!user.email_verified) {
          return "/auth/error?error=unverified-email";
        }

        let existingUser = await prisma.user.findFirst({
          include: {
            accounts: {
              where: {
                provider: account.provider,
              },
            },
          },
          where: {
            identityProvider: idP,
            identityProviderId: account.providerAccountId,
          },
        });

        /* --- START FIX LEGACY ISSUE WHERE 'identityProviderId' was accidentally set to userId --- */
        if (!existingUser) {
          existingUser = await prisma.user.findFirst({
            include: {
              accounts: {
                where: {
                  provider: account.provider,
                },
              },
            },
            where: {
              identityProvider: idP,
              identityProviderId: String(user.id),
            },
          });
          if (existingUser) {
            await prisma.user.update({
              where: {
                id: existingUser?.id,
              },
              data: {
                identityProviderId: account.providerAccountId,
              },
            });
          }
        }
        /* --- END FIXES LEGACY ISSUE WHERE 'identityProviderId' was accidentally set to userId --- */
        if (existingUser) {
          // In this case there's an existing user and their email address
          // hasn't changed since they last logged in.
          if (existingUser.email === user.email) {
            try {
              // If old user without Account entry we link their google account
              if (existingUser.accounts.length === 0) {
                const linkAccountWithUserData = { ...account, userId: existingUser.id };
                await calcomAdapter.linkAccount(linkAccountWithUserData);
              }
            } catch (error) {
              if (error instanceof Error) {
                console.error("Error while linking account of already existing user");
              }
            }
            if (existingUser.twoFactorEnabled && existingUser.identityProvider === idP) {
              return loginWithTotp(existingUser);
            } else {
              return true;
            }
          }

          // If the email address doesn't match, check if an account already exists
          // with the new email address. If it does, for now we return an error. If
          // not, update the email of their account and log them in.
          const userWithNewEmail = await prisma.user.findFirst({
            where: { email: user.email },
          });

          if (!userWithNewEmail) {
            await prisma.user.update({ where: { id: existingUser.id }, data: { email: user.email } });
            if (existingUser.twoFactorEnabled) {
              return loginWithTotp(existingUser);
            } else {
              return true;
            }
          } else {
            return "/auth/error?error=new-email-conflict";
          }
        }

        // If there's no existing user for this identity provider and id, create
        // a new account. If an account already exists with the incoming email
        // address return an error for now.
        const existingUserWithEmail = await prisma.user.findFirst({
          where: {
            email: {
              equals: user.email,
              mode: "insensitive",
            },
          },
        });

        if (existingUserWithEmail) {
          // if self-hosted then we can allow auto-merge of identity providers if email is verified
          if (
            !hostedCal &&
            existingUserWithEmail.emailVerified &&
            existingUserWithEmail.identityProvider !== IdentityProvider.CAL
          ) {
            if (existingUserWithEmail.twoFactorEnabled) {
              return loginWithTotp(existingUserWithEmail);
            } else {
              return true;
            }
          }

          // check if user was invited
          if (
            !existingUserWithEmail.password &&
            !existingUserWithEmail.emailVerified &&
            !existingUserWithEmail.username
          ) {
            await prisma.user.update({
              where: {
                email: existingUserWithEmail.email,
              },
              data: {
                // update the email to the IdP email
                email: user.email,
                // Slugify the incoming name and append a few random characters to
                // prevent conflicts for users with the same name.
                username: usernameSlug(user.name),
                emailVerified: new Date(Date.now()),
                name: user.name,
                identityProvider: idP,
                identityProviderId: account.providerAccountId,
              },
            });

            if (existingUserWithEmail.twoFactorEnabled) {
              return loginWithTotp(existingUserWithEmail);
            } else {
              return true;
            }
          }

          // User signs up with email/password and then tries to login with Google/SAML using the same email
          if (
            existingUserWithEmail.identityProvider === IdentityProvider.CAL &&
            (idP === IdentityProvider.GOOGLE || idP === IdentityProvider.SAML)
          ) {
            await prisma.user.update({
              where: { email: existingUserWithEmail.email },
              // also update email to the IdP email
              data: {
                password: null,
                email: user.email,
                identityProvider: idP,
                identityProviderId: account.providerAccountId,
              },
            });
            if (existingUserWithEmail.twoFactorEnabled) {
              return loginWithTotp(existingUserWithEmail);
            } else {
              return true;
            }
          } else if (existingUserWithEmail.identityProvider === IdentityProvider.CAL) {
            return "/auth/error?error=use-password-login";
          }

          return "/auth/error?error=use-identity-login";
        }

        // Associate with organization if enabled by flag and idP is Google (for now)
        const { orgUsername, orgId } = await checkIfUserShouldBelongToOrg(idP, user.email);

        const newUser = await prisma.user.create({
          data: {
            // Slugify the incoming name and append a few random characters to
            // prevent conflicts for users with the same name.
            username: orgId ? slugify(orgUsername) : usernameSlug(user.name),
            emailVerified: new Date(Date.now()),
            name: user.name,
            email: user.email,
            identityProvider: idP,
            identityProviderId: account.providerAccountId,
            ...(orgId && {
              verified: true,
              organization: { connect: { id: orgId } },
              teams: {
                create: { role: MembershipRole.MEMBER, accepted: true, team: { connect: { id: orgId } } },
              },
            }),
          },
        });

        const linkAccountNewUserData = { ...account, userId: newUser.id };
        await calcomAdapter.linkAccount(linkAccountNewUserData);

        if (account.twoFactorEnabled) {
          return loginWithTotp(newUser);
        } else {
          return true;
        }
      }

      return false;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same domain
      else if (new URL(url).hostname === new URL(WEBAPP_URL).hostname) return url;
      return baseUrl;
    },
  },
};
