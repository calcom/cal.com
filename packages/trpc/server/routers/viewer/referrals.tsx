import { z } from "zod";

import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import { createProtectedRouter } from "../../createRouter";

export const referralsRouter = createProtectedRouter()
  .query("referralsQuery", {
    async resolve({ ctx }) {
      let referrer = await prisma.user.findFirst({
        where: {
          id: ctx.user.id,
        },
        select: {
          id: true,
          username: true,
          referralPin: true,
        },
      });

      if (!referrer) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (!referrer.referralPin) {
        const referralPin = Math.floor(1000 + Math.random() * 9000);
        await prisma.user.update({
          where: {
            id: ctx.user.id,
          },
          data: {
            referralPin: referralPin,
          },
        });
        referrer = { ...referrer, referralPin: referralPin };
      }

      const refereesQuery = await prisma.referrals.findMany({
        where: {
          referrerId: referrer.id,
        },
        select: {
          refereeId: true,
        },
      });

      let referees;

      if (refereesQuery) {
        const refereeIds = refereesQuery.map(({ refereeId }) => refereeId);
        console.log("🚀 ~ file: referrals.tsx ~ line 51 ~ resolve ~ refereeIds", refereeIds);

        referees = await prisma.user.findMany({
          where: {
            id: {
              in: refereeIds,
            },
          },
          select: {
            name: true,
            username: true,
            avatar: true,
            email: true,
          },
        });
        console.log("🚀 ~ file: referrals.tsx ~ line 60 ~ resolve ~ referees", referees);
      }

      return { referrer, referees };
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
