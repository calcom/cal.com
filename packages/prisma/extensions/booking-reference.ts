import { Prisma } from "@prisma/client";

export function bookingReferenceExtension() {
  return Prisma.defineExtension({
    name: "softDelete",
    query: {
      bookingReference: {
        async delete({ args, query }) {
          return query({ ...args, action: "update", data: { deleted: true } });
        },

        async deleteMany({ args, query }) {
          return query({
            ...args,
            action: "updateMany",
            data: { ...(args.data || {}), deleted: true },
          });
        },

        async findUnique({ args, query }) {
          args.where = { ...(args.where || {}), deleted: null };
          return query(args);
        },

        async findFirst({ args, query }) {
          args.where = { ...(args.where || {}), deleted: null };
          return query(args);
        },

        async findMany({ args, query }) {
          args.where = { ...(args.where || {}), deleted: null };
          return query(args);
        },
      },
    },
  });
}
