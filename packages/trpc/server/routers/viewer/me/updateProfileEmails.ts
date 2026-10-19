import type { Prisma } from "@calcom/prisma/client";
import { TRPCError } from "@trpc/server";
import type { TUpdateProfileInputSchema } from "./updateProfile.schema";

type UpdateProfileEmailsOptions = {
  tx: Prisma.TransactionClient;
  userId: number;
  secondaryEmails: NonNullable<TUpdateProfileInputSchema["secondaryEmails"]>;
  promotedEmail?: { id: number };
  previousPrimaryEmail: string;
  previousPrimaryEmailVerified: Date | null;
  removePreviousPrimaryEmail?: boolean;
};

export const updateProfileEmails = async ({
  tx,
  userId,
  secondaryEmails,
  promotedEmail,
  previousPrimaryEmail,
  previousPrimaryEmailVerified,
  removePreviousPrimaryEmail,
}: UpdateProfileEmailsOptions) => {
  // Dirty form indices can also mark the promoted record as edited or deleted.
  // Its final state must be determined by the primary-email change alone.
  const changes = secondaryEmails.filter((email) => email.id !== promotedEmail?.id);
  if (promotedEmail) {
    changes.push({
      id: promotedEmail.id,
      email: previousPrimaryEmail,
      isDeleted: removePreviousPrimaryEmail === true,
    });
  }

  if (!changes.length) return;

  const existingEmails = await tx.secondaryEmail.findMany({
    where: { userId, id: { in: changes.map((email) => email.id) } },
    select: { id: true, email: true, emailVerified: true },
  });
  const existingById = new Map(existingEmails.map((email) => [email.id, email]));
  const modified = changes.filter((email) => !email.isDeleted);
  if (modified.some((email) => !existingById.has(email.id))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Secondary email no longer exists" });
  }

  const deletedIds = changes.filter((email) => email.isDeleted).map((email) => email.id);
  const detachedIds = [...new Set(promotedEmail ? [...deletedIds, promotedEmail.id] : deletedIds)];
  if (detachedIds.length) {
    // Deletion cascades to EventType; a swap would silently retarget notifications.
    // Scope by email ownership to include team event types without touching other users' emails.
    await tx.eventType.updateMany({
      where: { secondaryEmailId: { in: detachedIds }, secondaryEmail: { userId } },
      data: { secondaryEmailId: null },
    });
  }

  if (deletedIds.length) {
    await tx.secondaryEmail.deleteMany({ where: { userId, id: { in: deletedIds } } });
  }

  for (const updated of modified) {
    const existing = existingById.get(updated.id);
    let emailVerified = existing?.email === updated.email ? existing.emailVerified : null;
    if (updated.id === promotedEmail?.id) {
      emailVerified = previousPrimaryEmailVerified;
    }
    await tx.secondaryEmail.update({
      where: { id: updated.id, userId },
      data: { email: updated.email, emailVerified },
    });
  }
};
