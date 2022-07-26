import { z } from "zod";

import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import { createProtectedRouter } from "../../createRouter";

export const referralsRouter = createProtectedRouter()
  .query("referralsQuery", {
    async resolve({ ctx }) {
      let referral = await prisma.user.findFirst({
        where: {
          id: ctx.user.id,
        },
        select: {
          username: true,
          referralPin: true,
        },
      });

      if (!referral) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (!referral.referralPin) {
        const referralPin = Math.floor(1000 + Math.random() * 9000);
        await prisma.user.update({
          where: {
            id: ctx.user.id,
          },
          data: {
            referralPin: referralPin,
          },
        });
        referral = { ...referral, referralPin: referralPin };
      }

      console.log("🚀 ~ file: viewer.tsx ~ line 1256 ~ resolve ~ referral", referral);

      return referral;
    },
  })
  .mutation("sendReferralEmail", {
    input: z.object({
      emails: z.string(),
    }),
    async resolve({ input, ctx }) {
      const { emails } = input;
      console.log("🚀 ~ file: referrals.tsx ~ line 48 ~ resolve ~ emails", emails);
    },
  });
