import process from "node:process";
import createUsersAndConnectToOrg from "@calcom/features/ee/dsync/lib/users/createUsersAndConnectToOrg";
import ImpersonationProvider from "@calcom/features/ee/impersonation/lib/ImpersonationProvider";
import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";
import { clientSecretVerifier, isSAMLLoginEnabled } from "@calcom/features/ee/sso/lib/saml";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import {
  GOOGLE_CALENDAR_SCOPES,
  GOOGLE_OAUTH_SCOPES,
  HOSTED_CAL_FEATURES,
  IS_CALCOM,
  WEBAPP_URL,
} from "@calcom/lib/constants";
import { defaultCookies } from "@calcom/lib/default-cookies";
import { isENVDev } from "@calcom/lib/env";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { TrackingData } from "@calcom/lib/tracking";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { UserProfile } from "@calcom/types/UserProfile";
import { waitUntil } from "@vercel/functions";
import type { AuthOptions, User } from "next-auth";
import { encode } from "next-auth/jwt";
import type { Provider } from "next-auth/providers";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { dub } from "./dub";
import { ErrorCode } from "./ErrorCode";
import CalComAdapter from "./next-auth-custom-adapter";

const log = logger.getSubLogger({ prefix: ["next-auth-options"] });
const GOOGLE_API_CREDENTIALS = process.env.GOOGLE_API_CREDENTIALS || "{}";
const { client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET } =
  JSON.parse(GOOGLE_API_CREDENTIALS)?.web || {};
const GOOGLE_LOGIN_ENABLED = process.env.GOOGLE_LOGIN_ENABLED === "true";
const IS_GOOGLE_LOGIN_ENABLED = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_LOGIN_ENABLED);

const getDomainFromEmail = (email: string): string => email.split("@")[1];

/**
 * Authorize function for credentials provider
 * Delegates to AuthCredentialsService
 */
export async function authorizeCredentials(
  credentials: Record<"email" | "password" | "totpCode" | "backupCode", string> | undefined
): Promise<User | null> {
  const { getAuthCredentialsService } = await import("../di/AuthCredentialsService.container");
  const credentialsService = getAuthCredentialsService();
  return credentialsService.authorize(credentials);
}

export const CalComCredentialsProvider = CredentialsProvider({
  id: "credentials",
  name: "Cal.com",
  type: "credentials",
  credentials: {
    email: { label: "Email Address", type: "email", placeholder: "john.doe@example.com" },
    password: { label: "Password", type: "password", placeholder: "Your super secure password" },
    totpCode: { label: "Two-factor Code", type: "input", placeholder: "Code from authenticator app" },
    backupCode: { label: "Backup Code", type: "input", placeholder: "Two-factor backup code" },
  },
  authorize: authorizeCredentials,
});

const providers: Provider[] = [CalComCredentialsProvider, ImpersonationProvider];
type SamlIdpUser = {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  name: string;
  email_verified: boolean;
  profile: UserProfile;
  samlTenant?: string;
};

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
          prompt: "consent",
        },
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
      requested?: {
        tenant?: string;
        product?: string;
      };
    }) => {
      log.debug("BoxyHQ:profile", safeStringify({ profile }));
      if (!profile.email) {
        log.warn("saml:profile - email missing from IdP response", {
          hasFirstName: !!profile.firstName,
          hasLastName: !!profile.lastName,
          tenant: profile.requested?.tenant,
        });
      }
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
        // Pass SAML tenant for domain authority checks in signIn callback
        samlTenant: profile.requested?.tenant,
        ...(user && { profile: user.allProfiles[0] }),
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
      async authorize(credentials): Promise<SamlIdpUser | null> {
        log.debug("CredentialsProvider:saml-idp:authorize", safeStringify({ credentials }));
        if (!credentials) {
          log.warn("saml-idp:authorize - missing credentials object");
          return null;
        }

        const { code } = credentials;

        if (!code) {
          log.warn("saml-idp:authorize - missing code in credentials");
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
          log.warn("saml-idp:authorize - failed to obtain access_token from oauthController.token");
          return null;
        }
        // Fetch user info
        const userInfo = await oauthController.userInfo(access_token);

        if (!userInfo) {
          log.warn("saml-idp:authorize - failed to obtain userInfo from oauthController.userInfo");
          return null;
        }

        const { id, firstName, lastName, requested } = userInfo;
        const email = userInfo.email.toLowerCase();
        const userRepo = new UserRepository(prisma);
        let user = !email ? undefined : await userRepo.findByEmailAndIncludeProfilesAndPassword({ email });
        if (!user) {
          const hostedCal = Boolean(HOSTED_CAL_FEATURES);
          if (hostedCal && email) {
            const domain = getDomainFromEmail(email);
            const organizationRepository = getOrganizationRepository();
            const org = await organizationRepository.getVerifiedOrganizationByAutoAcceptEmailDomain(domain);
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
              user = await userRepo.findByEmailAndIncludeProfilesAndPassword({
                email: email,
              });
            }
          }
          if (!user) {
            log.warn("saml-idp:authorize - user not found and could not be auto-provisioned", {
              emailDomain: email.split("@")[1],
              hostedCal: Boolean(HOSTED_CAL_FEATURES),
            });
            throw new Error(ErrorCode.UserNotFound);
          }
        }
        const [userProfile] = user?.allProfiles ?? [];
        return {
          // This `id` is actually email as sent by the saml configuration of NameId=email
          // Instead of changing it, we introduce a new userId field to the object
          // Also, another reason to not touch it is that setting to to user.id starts breaking the saml-idp flow with an uncaught error something related to that it is expected to be a string
          id: id as unknown as number,
          userId: user.id,
          firstName,
          lastName,
          email,
          name: `${firstName} ${lastName}`.trim(),
          email_verified: true,
          profile: userProfile,
          // Pass SAML tenant for domain authority checks in signIn callback (IdP-initiated flow)
          samlTenant: requested?.tenant,
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

export const getOptions = ({
  getDubId,
  getTrackingData,
}: {
  /** so we can extract the Dub cookie in both pages and app routers */
  getDubId: () => string | undefined;
  /** Ad tracking data for Stripe customer metadata */
  getTrackingData: () => TrackingData;
}): AuthOptions => ({
  adapter: calcomAdapter,
  session: {
    strategy: "jwt",
  },
  jwt: {
    // decorate the native JWT encode function
    // Impl. detail: We don't pass through as this function is called with encode/decode functions.
    encode: async ({ token, maxAge, secret }) => {
      log.debug("jwt:encode", safeStringify({ token, maxAge }));
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
  cookies: defaultCookies(WEBAPP_URL?.startsWith("https://")),
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error", // Error code passed in query string as ?error=
    verifyRequest: "/auth/verify",
    // newUser: "/auth/new", // New users will be directed here on first sign in (leave the property out if not of interest)
  },
  providers,
  callbacks: {
    async jwt({ token, trigger, session, user, account }) {
      const { getAuthSessionService } = await import("../di/AuthSessionService.container");
      const sessionService = getAuthSessionService();
      return sessionService.enrichToken({ token, trigger, session, user, account });
    },
    async session({ session, token }) {
      const { getAuthSessionService } = await import("../di/AuthSessionService.container");
      const sessionService = getAuthSessionService();
      return sessionService.buildSession(session, token);
    },
    async signIn(params): Promise<boolean | string> {
      const { getAuthSignInService } = await import("../di/AuthSignInService.container");
      const signInService = getAuthSignInService();
      return signInService.handleSignIn({ ...params, getTrackingData });
    },
    /**
     * Used to handle the navigation right after successful login or logout
     */
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same domain
      else if (new URL(url).hostname === new URL(WEBAPP_URL).hostname) return url;
      return baseUrl;
    },
  },
  events: {
    async signIn(message) {
      /* only run this code if:
         - it's a hosted cal account
         - DUB_API_KEY is configured
         - it's a new user
      */
      const user = message.user as User & {
        username: string;
        createdDate: string;
      };
      // check if the user was created in the last 10 minutes
      // this is a workaround – in the future once we move to use the Account model in the DB
      // we should use NextAuth's isNewUser flag instead: https://next-auth.js.org/configuration/events#signin
      const isNewUser = new Date(user.createdDate) > new Date(Date.now() - 10 * 60 * 1000);
      if ((isENVDev || IS_CALCOM) && isNewUser) {
        if (process.env.DUB_API_KEY) {
          const clickId = getDubId();
          // check if there's a clickId (dub_id) cookie set by @dub/analytics
          if (clickId) {
            // here we use waitUntil – meaning this code will run async to not block the main thread
            waitUntil(
              // if so, send a lead event to Dub
              // @see https://d.to/conversions/next-auth
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
      }
    },
  },
});
