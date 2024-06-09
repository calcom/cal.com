// import { prisma } from "@calcom/prisma";
// import type { Prisma } from "@calcom/prisma/client";

// export async function substituteActorUserIdByName(userId: number, fullName: string) {
//   //Triggered When a user is deleted to replace the actorUserId with the user's full name
//   await prisma.auditLog.updateMany({
//     where: {
//       actorUserId: userId,
//     },
//     data: {
//       actorUserId: null,
//       legacyActorUserFullName: fullName,
//     },
//   });
//   const toBeUpdatedAuditLogs = await prisma.auditLog.findMany({
//     where: { target: { path: ["targetUser"], equals: userId } },
//   });

//   toBeUpdatedAuditLogs.forEach(async (toBeUpdatedAuditLog) => {
//     const updatedTarget = toBeUpdatedAuditLog.target as Prisma.JsonObject;
//     if ("targetUser" in updatedTarget) {
//       updatedTarget.targetUser = fullName;
//       await prisma.auditLog.update({
//         where: { id: toBeUpdatedAuditLog.id },
//         data: { target: updatedTarget },
//       });
//     }
//   });
// }
