import userRequired from "@server/middlewares/userRequired";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import checkPremiumUsername from "@ee/lib/core/checkUsername";

import checkRegularUsername from "@lib/core/checkUsername";
import slugify from "@lib/slugify";

import { createRouter } from "../createRouter";

const checkUsername =
  process.env.NEXT_PUBLIC_APP_URL === "https://cal.com" ? checkPremiumUsername : checkRegularUsername;

export const userRouter = createRouter()
  // check that user is authenticated
  .middleware(userRequired)
  // Check premium user name
  .mutation("profile", {
    input: z.object({
      username: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      avatar: z.string().optional(),
      timeZone: z.string().optional(),
      weekStart: z.string().optional(),
      hideBranding: z.boolean().optional(),
      theme: z.string().optional(),
      completedOnboarding: z.boolean().optional(),
      locale: z.string().optional(),
    }),
    async resolve({ input, ctx }) {
      const { user, prisma } = ctx;
      const { name, avatar, timeZone, weekStart, hideBranding, theme, completedOnboarding, locale } = input;
      let username;

      if (input.username) {
        username = slugify(input.username);
        // Only validate if we're changing usernames
        if (username !== user.username) {
          const response = await checkUsername(username);
          if (response.status !== 200) {
            const { message } = await response.json();
            throw new TRPCError({ code: "BAD_REQUEST", message });
          }
        }
      }

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          username,
          name,
          avatar,
          timeZone,
          weekStart,
          hideBranding,
          theme,
          completedOnboarding,
          locale,
          bio: input.description,
        },
      });

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            message: "Profile updated successfully",
          }),
      });
    },
  });
