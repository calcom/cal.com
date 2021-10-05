import NextAuth from "next-auth";

import { Session } from "@lib/auth";
import prisma from "@lib/prisma";

export default NextAuth({
  session: {
    jwt: true,
  },
  debug: true,
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error", // Error code passed in query string as ?error=
  },
  providers: [
    // Providers.Credentials({
    //   name: "Calendso",
    //   credentials: {
    //     email: { label: "Email Address", type: "email", placeholder: "john.doe@example.com" },
    //     password: { label: "Password", type: "password", placeholder: "Your super secure password" },
    //   },
    //   async authorize(credentials) {
    //     const user = await prisma.user.findFirst({
    //       where: {
    //         email: credentials.email,
    //       },
    //     });

    //     if (!user) {
    //       throw new Error("No user found");
    //     }
    //     if (!user.password) {
    //       throw new Error("Incorrect password");
    //     }

    //     const isValid = await verifyPassword(credentials.password, user.password);

    //     if (!isValid) {
    //       throw new Error("Incorrect password");
    //     }

    //     return {
    //       id: user.id,
    //       username: user.username,
    //       email: user.email,
    //       name: user.name,
    //       image: user.avatar,
    //     };
    //   },
    // }),
    {
      id: "yac",
      name: "Yac",
      type: "oauth",
      version: "2.0",
      scope: "",
      params: { grant_type: "authorization_code" },
      accessTokenUrl: "https://integrations.yac.com/api/oauth/token?response_type=oauth-compliant",
      authorizationUrl: "https://integrations.yac.com/api/oauth/authorize",
      profileUrl: "https://integrations.yac.com/api/oauth/me",
      protection: "state",
      async profile(profile) {
        // You can use the tokens, in case you want to fetch more profile information
        // For example several OAuth providers do not return email by default.
        // Depending on your provider, will have tokens like `access_token`, `id_token` and or `refresh_token`
        const yacProfileData: {
          id: number;
          username: string;
          realName: string;
          token: string;
          secret: string;
        } = (profile as any).data;
        const yacSessionData = (
          (await (
            await fetch(`http://api-v3.yacchat.com/api/v2/users/${yacProfileData.id}/session`, {
              method: "GET",
              headers: {
                authorization: yacProfileData.token,
                "Content-Type": "application/json",
              },
            })
          ).json()) || {}
        ).sessionData as { image: string; email: string };
        const { id, realName: name, username, email, image } = { ...yacSessionData, ...yacProfileData };

        await prisma.user.upsert({
          where: { id },
          update: {
            username,
            email,
            name,
            avatar: image,
          },
          create: {
            id,
            name,
            username,
            email,
            emailVerified: new Date(Date.now()),
            avatar: image,
          },
        });
        const yacCredential = await prisma.credential.findFirst({
          where: {
            type: "yac",
            userId: id,
          },
          select: {
            id: true,
          },
        });
        if (yacCredential && yacCredential.id) {
          await prisma.credential.update({
            where: { id: yacCredential.id },
            data: {
              key: {
                api_token: yacProfileData.token,
              },
            },
          });
        } else {
          await prisma.credential.create({
            data: {
              userId: id,
              type: "yac",
              key: {
                api_token: yacProfileData.token,
              },
            },
          });
        }

        const syncEventType = await prisma.eventType.findFirst({
          where: {
            slug: "sync",
            userId: id,
          },
          select: {
            id: true,
          },
        });
        if (syncEventType && syncEventType.id) {
          await prisma.eventType.update({
            where: { id: syncEventType.id },
            data: {
              title: "Sync Meeting",
              userId: id,
              length: 45,
              eventName: `${name} <> {USER}`,
              users: {
                connect: {
                  id,
                },
              },
            },
          });
        } else {
          await prisma.eventType.create({
            data: {
              title: "Sync Meeting",
              userId: id,
              slug: "sync",
              description: `Sync meeting with ${name}.`,
              length: 45,
              eventName: `${name} <> {USER}`,
              locations: [{ type: "integrations:zoom" }],
              users: {
                connect: {
                  id,
                },
              },
            },
          });
        }

        const asyncEventType = await prisma.eventType.findFirst({
          where: {
            slug: "async",
            userId: id,
          },
          select: {
            id: true,
          },
        });
        if (asyncEventType && asyncEventType.id) {
          await prisma.eventType.update({
            where: { id: asyncEventType.id },
            data: {
              title: "Async Meeting",
              userId: id,
              length: 10,
              eventName: `[async] ${name} <> {USER}`,
              locations: null,
              users: {
                connect: {
                  id,
                },
              },
            },
          });
        } else {
          await prisma.eventType.create({
            data: {
              title: "Async Meeting",
              userId: id,
              slug: "async",
              description: `Async meeting with ${name}.`,
              length: 10,
              eventName: `[async] ${name} <> {USER}`,
              locations: null,
              users: {
                connect: {
                  id,
                },
              },
            },
          });
        }

        return {
          id,
          name,
          username,
          email,
          image,
        };
      },
      clientId: process.env.YAC_INTEGRATION_CLIENT_ID || "",
      clientSecret: process.env.YAC_INTEGRATION_CLIENT_SECRET || "",
    },
  ],
  callbacks: {
    async jwt(token, user) {
      // Add username to the token right after signin
      if (user?.username) {
        token.id = user.id;
        token.username = user.username;
      }
      return token;
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
  },
});
