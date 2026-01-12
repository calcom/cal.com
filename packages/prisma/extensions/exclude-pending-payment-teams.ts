import { Prisma } from "../client";

export function excludePendingPaymentsExtension() {
  return Prisma.defineExtension({
    query: {
      team: {
        async findUnique({ args, query }) {
          return excludePendingPayments(args, query);
        },
        async findFirst({ args, query }) {
          return excludePendingPayments(args, query);
        },
        async findMany({ args, query }) {
          return excludePendingPayments(args, query);
        },
        async findUniqueOrThrow({ args, query }) {
          return excludePendingPayments(args, query);
        },
        async findFirstOrThrow({ args, query }) {
          return excludePendingPayments(args, query);
        },
      },
    },
  });
}

async function excludePendingPayments(
  args:
    | Prisma.TeamFindUniqueArgs
    | Prisma.TeamFindFirstArgs
    | Prisma.TeamFindManyArgs
    | Prisma.TeamFindUniqueOrThrowArgs
    | Prisma.TeamFindFirstOrThrowArgs,
  query: <T>(args: T) => Promise<unknown>
) {
  args.where = args.where || {};
  if (args.where.pendingPayment === undefined) {
    args.where.pendingPayment = false;
  }
  return query(args);
}
