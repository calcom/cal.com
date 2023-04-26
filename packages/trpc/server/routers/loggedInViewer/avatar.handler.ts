import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type AvatarOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const avatarHandler = async ({ ctx }: AvatarOptions) => {
  return {
    avatar: ctx.user.rawAvatar,
  };
};
