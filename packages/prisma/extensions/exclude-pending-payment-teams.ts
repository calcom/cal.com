import { Prisma } from "@prisma/client";
import type { DefaultArgs, InternalArgs } from "@prisma/client/runtime/library";

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
    | Prisma.TeamFindUniqueArgs<InternalArgs & DefaultArgs>
    | Prisma.TeamFindFirstArgs<InternalArgs & DefaultArgs>
    | Prisma.TeamFindManyArgs<InternalArgs & DefaultArgs>
    | Prisma.TeamFindUniqueOrThrowArgs<InternalArgs & DefaultArgs>
    | Prisma.TeamFindFirstOrThrowArgs<InternalArgs & DefaultArgs>,
  query: <T>(args: T) => Promise<unknown>
) {
  args.where = args.where || {};
  if (args.where.pendingPayment === undefined) {
    args.where.pendingPayment = false;
  }
  return query(args);
}
