import { TRPCError } from "@trpc/server";

import { createProtectedRouter } from "../../createRouter";

export const viewerTeamsRouter = createProtectedRouter().query("referrals", {
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
});
