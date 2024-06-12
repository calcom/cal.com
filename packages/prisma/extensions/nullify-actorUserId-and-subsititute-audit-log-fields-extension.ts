import type { User, EventType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import saveFieldSubstitutersWorker from "audit-log/saveFieldSubstitutersWorker";

import { FieldSubstituterOption } from "@calcom/features/audit-log/types/TFieldSubstituterInput";
import { prisma } from "@calcom/prisma";

function nullifyActorUserId_and_SubsitituteAuditLogFields() {
  return Prisma.defineExtension({
    query: {
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
          const deletedEventType = (await query(args)) as EventType;
          if (prisma.auditLog)
            saveFieldSubstitutersWorker({
              triggeredEvent: FieldSubstituterOption.EventTypeDelete,
              deletedEventType,
            });

          return deletedEventType;
        },
        async deleteMany({ args, query }) {
          delete args.where?.actorUserId;
          let returnDeletedEventTypes;
          if (prisma.auditLog) {
            const deletedEventTypes = await prisma.eventType.findMany({ where: args.where });
            returnDeletedEventTypes = await query(args);
            saveFieldSubstitutersWorker({
              triggeredEvent: FieldSubstituterOption.EventTypeDeleteMany,
              deletedEventTypes,
            });
          } else returnDeletedEventTypes = await query(args);
          return returnDeletedEventTypes;
        },
      },
      user: {
        async update({ args, query }) {
          let returnUpdatedUser;
          if (args.data.email && prisma.auditLog) {
            const prevUser = (await query(args)) as User;
            returnUpdatedUser = await query(args);
            const updatedUser = (await query(args)) as User;
            saveFieldSubstitutersWorker({
              triggeredEvent: FieldSubstituterOption.UserUpdate,
              prevUser,
              updatedUser,
            });
          } else await query(args);
          return returnUpdatedUser;
        },
        async delete({ args, query }) {
          const deletedUser = (await query(args)) as User;
          if (prisma.auditLog)
            saveFieldSubstitutersWorker({
              triggeredEvent: FieldSubstituterOption.UserDelete,
              deletedUser,
            });
          return deletedUser;
        },
      },
      team: {},
    },
  });
}

export default nullifyActorUserId_and_SubsitituteAuditLogFields;
