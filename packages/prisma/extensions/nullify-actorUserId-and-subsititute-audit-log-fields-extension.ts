import type { User, EventType } from "@prisma/client";
import { Prisma } from "@prisma/client";

import saveFieldSubstituters from "@calcom/features/audit-log/saveFieldSubstituters";
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

          let auditLogRecordExists = false;
          const auditLogRecord = await prisma.auditLog.findFirst();
          if (auditLogRecord) auditLogRecordExists = true;

          if (auditLogRecordExists)
            saveFieldSubstituters({
              triggeredEvent: FieldSubstituterOption.EventTypeDelete,
              deletedEventType,
            });

          return deletedEventType;
        },
        async deleteMany({ args, query }) {
          delete args.where?.actorUserId;
          let returnDeletedEventTypes;

          let auditLogRecordExists = false;
          const auditLogRecord = await prisma.auditLog.findFirst();
          if (auditLogRecord) auditLogRecordExists = true;

          if (auditLogRecordExists) {
            const deletedEventTypes = await prisma.eventType.findMany({ where: args.where });
            returnDeletedEventTypes = await query(args);
            saveFieldSubstituters({
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

          let auditLogRecordExists = false;
          const auditLogRecord = await prisma.auditLog.findFirst();
          if (auditLogRecord) auditLogRecordExists = true;

          if (args.data.email && auditLogRecordExists) {
            const prevUser = (await query(args)) as User;
            returnUpdatedUser = await query(args);
            const updatedUser = (await query(args)) as User;
            saveFieldSubstituters({
              triggeredEvent: FieldSubstituterOption.UserUpdate,
              prevUser,
              updatedUser,
            });
          } else await query(args);
          return returnUpdatedUser;
        },
        async delete({ args, query }) {
          const deletedUser = (await query(args)) as User;

          let auditLogRecordExists = false;
          const auditLogRecord = await prisma.auditLog.findFirst();
          if (auditLogRecord) auditLogRecordExists = true;

          if (auditLogRecordExists)
            saveFieldSubstituters({
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
