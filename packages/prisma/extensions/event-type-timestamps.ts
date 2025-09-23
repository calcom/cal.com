import { Prisma } from "@calcom/prisma/client";

export function eventTypeTimestampsExtension() {
  return Prisma.defineExtension({
    query: {
      eventType: {
        async create({ args, query }) {
          const now = new Date();
          if (!args.data.createdAt) {
            args.data.createdAt = now;
          }
          if (!args.data.updatedAt) {
            args.data.updatedAt = now;
          }
          return query(args);
        },
        async createMany({ args, query }) {
          const now = new Date();
          if (Array.isArray(args.data)) {
            args.data = args.data.map(item => ({
              ...item,
              createdAt: item.createdAt || now,
              updatedAt: item.updatedAt || now,
            }));
          } else {
            if (!args.data.createdAt) {
              args.data.createdAt = now;
            }
            if (!args.data.updatedAt) {
              args.data.updatedAt = now;
            }
          }
          return query(args);
        },
      },
    },
  });
}
