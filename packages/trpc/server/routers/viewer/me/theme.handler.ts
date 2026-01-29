import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type ThemeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const themeHandler = async ({ ctx }: ThemeOptions) => {
  const { user: sessionUser } = ctx;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: {
      brandColor: true,
      darkBrandColor: true,
      appTheme: true,
    },
  });

  return {
    brandColor: user.brandColor,
    darkBrandColor: user.darkBrandColor,
    appTheme: user.appTheme,
  };
};

export default themeHandler;
