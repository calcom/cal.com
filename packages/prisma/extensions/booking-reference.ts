import { Prisma } from "@calcom/prisma/client";

export function bookingReferenceExtension() {
  return Prisma.defineExtension({
    name: "bookingReferenceSoftDelete",
    query: {
      bookingReference: {
        async delete({ args, query }) {
          const updateArgs: Prisma.BookingReferenceUpdateArgs = {
            where: args.where,
            data: { deleted: true },
          };
          return query(updateArgs);
        },
        async deleteMany({ args, query }) {
          const updateArgs: Prisma.BookingReferenceUpdateManyArgs = {
            where: args.where,
            data: { deleted: true },
          };
          return query(updateArgs);
        },
        async findUnique({ args, query }) {
          if (args.where) {
            args.where = {
              ...args.where,
              deleted: null,
            };
          }
          return query(args);
        },
        async findMany({ args, query }) {
          if (args.where) {
            if (args.where.deleted === undefined) {
              args.where = {
                ...args.where,
                deleted: null,
              };
            }
          } else {
            args.where = { deleted: null };
          }
          return query(args);
        },
        async findFirst({ args, query }) {
          if (args.where) {
            if (args.where.deleted === undefined) {
              args.where = {
                ...args.where,
                deleted: null,
              };
            }
          } else {
            args.where = { deleted: null };
          }
          return query(args);
        },
      },
    },
  });
}
