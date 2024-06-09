import { Prisma } from "@prisma/client";

function nullifyActorUserId() {
  return Prisma.defineExtension({
    query: {
      eventType: {
        async create({ args, query }) {
          args.data.actorUserId = null;
          return await query(args);
        },
        async update({ args, query }) {
          args.data.actorUserId = null;
          return await query(args);
        },
        async updateMany({ args, query }) {
          args.data.actorUserId = null;
          return await query(args);
        },
        async delete({ args, query }) {
          delete args.where?.actorUserId;
          return await query(args);
        },
        async deleteMany({ args, query }) {
          delete args.where?.actorUserId;
          return await query(args);
        },
      },
      booking: {
        async create({ args, query }) {
          args.data.actorUserId = null;
          return await query(args);
        },
        async update({ args, query }) {
          args.data.actorUserId = null;
          return await query(args);
        },
        async updateMany({ args, query }) {
          args.data.actorUserId = null;
          return await query(args);
        },
      },
    },
  });
}

export default nullifyActorUserId;
