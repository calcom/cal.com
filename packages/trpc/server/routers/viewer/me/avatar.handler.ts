import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { Session } from "next-auth";

type AvatarOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    session: Session;
  };
};

export const avatarHandler = async ({ ctx }: AvatarOptions) => {
  const { user: sessionUser, session } = ctx;

  const user = await new UserRepository(prisma).enrichUserWithTheProfile({
    user: sessionUser,
    upId: session.upId,
  });

  const username = user.organization?.isPlatform
    ? user.username ?? null
    : user.profile?.username ?? user.username ?? null;

  return {
    avatar: getUserAvatarUrl(user),
    avatarUrl: user.avatarUrl,
    name: user.name,
    username,
  };
};

export default avatarHandler;
