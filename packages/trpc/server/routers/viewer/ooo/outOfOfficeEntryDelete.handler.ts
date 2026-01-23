import { sendBookingRedirectNotification } from "@calcom/emails/workflow-email-service";
import HrmsManager from "@calcom/lib/hrmsManager/hrmsManager";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import { isAdminForUser } from "./outOfOffice.utils";
import type { TOutOfOfficeDelete } from "./outOfOfficeEntryDelete.schema";

const log = logger.getSubLogger({ prefix: ["[outOfOfficeEntryDelete.handler]"] });

type TBookingRedirectDelete = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TOutOfOfficeDelete;
};

export const outOfOfficeEntryDelete = async ({ ctx, input }: TBookingRedirectDelete) => {
  if (!input.outOfOfficeUid) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "out_of_office_id_required" });
  }

  let oooUserId = ctx.user.id;
  let oooUserEmail = ctx.user.email;
  let oooUserName = ctx.user.username;

  if (input.userId && input.userId !== ctx.user.id) {
    const isAdmin = await isAdminForUser(ctx.user.id, input.userId);
    if (!isAdmin) {
      throw new TRPCError({ code: "NOT_FOUND", message: "only_admin_can_delete_ooo" });
    }
    oooUserId = input.userId;
    const oooUser = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { username: true, email: true },
    });
    if (oooUser) {
      oooUserEmail = oooUser.email;
      oooUserName = oooUser.username;
    }
  }

  // First, fetch the OOO entry with its external references before deleting
  const oooEntry = await prisma.outOfOfficeEntry.findUnique({
    where: {
      uuid: input.outOfOfficeUid,
      userId: oooUserId,
    },
    select: {
      id: true,
      start: true,
      end: true,
      externalReferences: {
        select: {
          id: true,
          source: true,
          externalId: true,
          credential: {
            select: {
              id: true,
              type: true,
              key: true,
              appId: true,
              userId: true,
              teamId: true,
              invalid: true,
              delegationCredentialId: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      },
      toUser: {
        select: {
          email: true,
          username: true,
        },
      },
    },
  });

  if (!oooEntry) {
    throw new TRPCError({ code: "NOT_FOUND", message: "booking_redirect_not_found" });
  }

  // Delete HRMS time-off entries before deleting the OOO entry
  try {
    for (const reference of oooEntry.externalReferences) {
      if (reference.credential) {
        const hrmsManager = new HrmsManager(reference.credential);
        await hrmsManager.deleteOOO(reference.externalId);
        log.info("Deleted HRMS time-off request", {
          source: reference.source,
          externalId: reference.externalId,
        });
      }
    }
  } catch (error) {
    log.error("Failed to delete HRMS time-off request", { error });
  }

  // Now delete the OOO entry (cascade will delete references)
  const deletedOutOfOfficeEntry = await prisma.outOfOfficeEntry.delete({
    where: {
      uuid: input.outOfOfficeUid,
      userId: oooUserId,
    },
    select: {
      start: true,
      end: true,
      toUser: {
        select: {
          email: true,
          username: true,
        },
      },
    },
  });

  if (!deletedOutOfOfficeEntry) {
    throw new TRPCError({ code: "NOT_FOUND", message: "booking_redirect_not_found" });
  }

  // Return early if no redirect user is set, and no email needs to be send.
  if (!deletedOutOfOfficeEntry.toUser) {
    return {};
  }

  const t = await getTranslation(ctx.user.locale ?? "en", "common");

  const formattedStartDate = new Intl.DateTimeFormat("en-US").format(deletedOutOfOfficeEntry.start);
  const formattedEndDate = new Intl.DateTimeFormat("en-US").format(deletedOutOfOfficeEntry.end);

  await sendBookingRedirectNotification({
    language: t,
    fromEmail: oooUserEmail,
    eventOwner: oooUserName || oooUserEmail,
    toEmail: deletedOutOfOfficeEntry.toUser.email,
    toName: deletedOutOfOfficeEntry.toUser.username || "",
    dates: `${formattedStartDate} - ${formattedEndDate}`,
    action: "cancel",
  });

  return {};
};
