import type { Prisma } from "@calcom/prisma/client";

type EnforceTrueOrNested<T> = {
  [K in keyof T]: T[K] extends object ? EnforceTrueOrNested<T[K]> : true; // only allow `true` at leaves
};

export type HashedLinkSelect = EnforceTrueOrNested<
  Pick<Prisma.HashedLinkSelect, "id"> & {
    eventType?: Pick<Prisma.EventTypeSelect, "userId" | "teamId"> & {
      hosts?: {
        user?: Prisma.UserSelect;
      };
      profile?: {
        user?: Prisma.UserSelect;
      };
      owner?: Prisma.UserSelect;
    };
  }
>;
