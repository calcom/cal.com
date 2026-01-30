import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type ThemeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const themeHandler = async ({ ctx }: ThemeOptions) => {
  const { user: sessionUser } = ctx;

  const userRepository = new UserRepository(prisma);
  const user = await userRepository.findThemeByUserId({ userId: sessionUser.id });

  return {
    brandColor: user.brandColor,
    darkBrandColor: user.darkBrandColor,
    appTheme: user.appTheme,
  };
};

export default themeHandler;
