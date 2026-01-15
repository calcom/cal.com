import { Prisma } from "../client";

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

function safeJSONStringify(x: unknown) {
  try {
    return JSON.stringify(x);
  } catch {
    return "";
  }
}

async function excludeLockedUsers(
  args:
    | Prisma.UserFindUniqueArgs
    | Prisma.UserFindFirstArgs
    | Prisma.UserFindManyArgs
    | Prisma.UserFindUniqueOrThrowArgs
    | Prisma.UserFindFirstOrThrowArgs,
  query: <T>(args: T) => Promise<unknown>
) {
  args.where = args.where || {};
  const whereString = safeJSONStringify(args.where);
  const shouldIncludeLocked = whereString.includes('"locked":');
  // Unless explicitly specified, we exclude locked users
  if (!shouldIncludeLocked) {
    args.where.locked = false;
  }
  return query(args);
}
