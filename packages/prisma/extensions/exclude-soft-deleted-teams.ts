import { Prisma } from "../client";

export function excludeSoftDeletedTeamsExtension() {
  return Prisma.defineExtension({
    query: {
      team: {
        async findUnique({ args, query }) {
          return excludeSoftDeletedTeams(args, query);
        },
        async findFirst({ args, query }) {
          return excludeSoftDeletedTeams(args, query);
        },
        async findMany({ args, query }) {
          return excludeSoftDeletedTeams(args, query);
        },
        async findUniqueOrThrow({ args, query }) {
          return excludeSoftDeletedTeams(args, query);
        },
        async findFirstOrThrow({ args, query }) {
          return excludeSoftDeletedTeams(args, query);
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

async function excludeSoftDeletedTeams(
  args:
    | Prisma.TeamFindUniqueArgs
    | Prisma.TeamFindFirstArgs
    | Prisma.TeamFindManyArgs
    | Prisma.TeamFindUniqueOrThrowArgs
    | Prisma.TeamFindFirstOrThrowArgs,
  query: <T>(args: T) => Promise<unknown>
) {
  args.where = args.where || {};
  const whereString = safeJSONStringify(args.where);
  const shouldIncludeDeleted = whereString.includes('"deletedAt":');
  if (!shouldIncludeDeleted) {
    args.where.deletedAt = null;
  }
  return query(args);
}
