import { Prisma } from "@prisma/client";
import type { DefaultArgs, InternalArgs } from "@prisma/client/runtime/library";

export function excludeLockedUsersExtension() {
  return Prisma.defineExtension({
    query: {
      user: {
        async findUnique({ args, query }) {
          return excludeLockedUsers(args, query);
        },
        async findFirst({ args, query }) {
          return excludeLockedUsers(args, query);
        },
        async findMany({ args, query }) {
          return excludeLockedUsers(args, query);
        },
        async findUniqueOrThrow({ args, query }) {
          return excludeLockedUsers(args, query);
        },
        async findFirstOrThrow({ args, query }) {
          return excludeLockedUsers(args, query);
        },
      },
    },
  });
}

async function excludeLockedUsers(
  args:
    | Prisma.UserFindUniqueArgs<InternalArgs & DefaultArgs>
    | Prisma.UserFindFirstArgs<InternalArgs & DefaultArgs>
    | Prisma.UserFindManyArgs<InternalArgs & DefaultArgs>
    | Prisma.UserFindUniqueOrThrowArgs<InternalArgs & DefaultArgs>
    | Prisma.UserFindFirstOrThrowArgs<InternalArgs & DefaultArgs>,
  query: <T>(args: T) => Promise<unknown>
) {
  args.where = args.where || {};
  // Unless explicitly specified, we exclude locked users
  if (args.where.locked === undefined) {
    args.where.locked = false;
  }
  return query(args);
}
