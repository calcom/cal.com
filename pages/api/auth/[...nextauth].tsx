import NextAuth from "next-auth";
import Providers, { AppProviders } from "next-auth/providers";
import { authenticator } from "otplib";

import { ErrorCode, isGoogleLoginEnabled, isSAMLLoginEnabled, Session, verifyPassword } from "@lib/auth";
import { symmetricDecrypt } from "@lib/crypto";
import prisma from "@lib/prisma";
import slugify from "@lib/slugify";

import { IdentityProvider } from ".prisma/client";

function randomString(length = 12) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

async function authorize(credentials) {
  const user = await prisma.user.findUnique({
    where: {
      email: credentials.email,
    },
  });

  if (!user) {
    throw new Error(ErrorCode.UserNotFound);
  }

  if (user.identityProvider !== IdentityProvider.CAL) {
    throw new Error(ErrorCode.ThirdPartyIdentityProviderEnabled);
  }

  if (!user.password) {
    throw new Error(ErrorCode.UserMissingPassword);
  }

  const isCorrectPassword = await verifyPassword(credentials.password, user.password);
  if (!isCorrectPassword) {
    throw new Error(ErrorCode.IncorrectPassword);
  }

  if (user.twoFactorEnabled) {
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

    const isValidToken = authenticator.check(credentials.totpCode, secret);
    if (!isValidToken) {
      throw new Error(ErrorCode.IncorrectTwoFactorCode);
    }
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
  };
}

const providers: AppProviders = [
  Providers.Credentials({
    name: "Cal.com",
    credentials: {
      email: { label: "Email Address", type: "email", placeholder: "john.doe@example.com" },
      password: { label: "Password", type: "password", placeholder: "Your super secure password" },
      totpCode: { label: "Two-factor Code", type: "input", placeholder: "Code from authenticator app" },
    },
    authorize,
  }),
];

if (isGoogleLoginEnabled) {
  providers.push(
    Providers.Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (isSAMLLoginEnabled) {
  providers.push({
    id: "saml",
    name: "BoxyHQ",
    type: "oauth",
    version: "2.0",
    params: {
      grant_type: "authorization_code",
    },
    accessTokenUrl: `${process.env.SAML_LOGIN_URL}/oauth/token`,
    authorizationUrl: `${process.env.SAML_LOGIN_URL}/oauth/authorize?response_type=code&provider=saml`,
    profileUrl: `${process.env.SAML_LOGIN_URL}/oauth/userinfo`,
    profile: (profile) => {
      return {
        ...profile,
        name: `${profile.firstName} ${profile.lastName}`,
        verified_email: true,
      };
    },
    clientId: `tenant=${process.env.SAML_TENANT_ID}&product=${process.env.SAML_PRODUCT_ID}`,
    clientSecret: "dummy",
  });
}

export default NextAuth({
  session: {
    jwt: true,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error", // Error code passed in query string as ?error=
  },
  providers,
  callbacks: {
    async jwt(token, user, account, profile) {
      if (!user) {
        return token;
      }

      if (account.type === "credentials") {
        return {
          id: user.id,
          username: user.username,
          email: user.email,
        };
      }

      // The arguments above are from the provider so we need to look up the
      // user based on those values in order to construct a JWT.
      if (account.type === "oauth" && account.provider) {
        let idP = IdentityProvider.GOOGLE;
        if (account.provider === "saml") {
          idP = IdentityProvider.SAML;
        }

        const existingUser = await prisma.user.findFirst({
          where: {
            AND: [
              {
                identityProvider: idP,
              },
              {
                identityProviderId: profile.id as string,
              },
            ],
          },
        });

        if (!existingUser) {
          return token;
        }

        return {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
        };
      }
    },
    async session(session, token) {
      const calendsoSession: Session = {
        ...session,
        user: {
          ...session.user,
          id: token.id as number,
          username: token.username as string,
        },
      };
      return calendsoSession;
    },
    async signIn(user, account, profile) {
      // In this case we've already verified the credentials in the authorize
      // callback so we can sign the user in.
      if (account.type === "credentials") {
        return true;
      }

      if (account.type !== "oauth") {
        return false;
      }

      if (account.provider) {
        let idP = IdentityProvider.GOOGLE;
        if (account.provider === "saml") {
          idP = IdentityProvider.SAML;
        }
        user.verified_email = user.verified_email || profile.verified_email;

        if (!user.verified_email) {
          return "/auth/error?error=unverified-email";
        }

        const existingUser = await prisma.user.findFirst({
          where: {
            AND: [{ identityProvider: idP }, { identityProviderId: user.id as string }],
          },
        });

        if (existingUser) {
          // In this case there's an existing user and their email address
          // hasn't changed since they last logged in.
          if (existingUser.email === user.email) {
            return true;
          }

          // If the email address doesn't match, check if an account already exists
          // with the new email address. If it does, for now we return an error. If
          // not, update the email of their account and log them in.
          const userWithNewEmail = await prisma.user.findFirst({
            where: { email: user.email },
          });

          if (!userWithNewEmail) {
            await prisma.user.update({ where: { id: existingUser.id }, data: { email: user.email } });
            return true;
          } else {
            return "/auth/error?error=new-email-conflict";
          }
        }

        // If there's no existing user for this identity provider and id, create
        // a new account. If an account already exists with the incoming email
        // address return an error for now.
        const existingUserWithEmail = await prisma.user.findFirst({
          where: { email: user.email },
        });

        if (existingUserWithEmail) {
          if (existingUserWithEmail.identityProvider === IdentityProvider.CAL) {
            return "/auth/error?error=use-password-login";
          }

          return "/auth/error?error=use-identity-login";
        }

        await prisma.user.create({
          data: {
            // Slugify the incoming name and append a few random characters to
            // prevent conflicts for users with the same name.
            username: slugify(user.name) + "-" + randomString(6),
            email: user.email,
            identityProvider: idP,
            identityProviderId: user.id as string,
          },
        });

        return true;
      }
    },
  },
});
