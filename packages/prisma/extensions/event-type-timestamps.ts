import { Prisma } from "@calcom/prisma/client";

export function eventTypeTimestampsExtension() {
  return Prisma.defineExtension({
    query: {
      eventType: {
        async create({ args, query }) {
          const now = new Date();
          args.data.createdAt = now;
          return query(args);
        },
        async createMany({ args, query }) {
          const now = new Date();
          if (Array.isArray(args.data)) {
            args.data = args.data.map((item) => ({
              ...item,
              createdAt: now,
            }));
          } else {
            args.data.createdAt = now;
          }
          return query(args);
        },
      },
    },
  });
}
