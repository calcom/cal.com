import { sendBookingRedirectNotification } from "@calcom/emails/workflow-email-service";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import { isAdminForUser } from "./outOfOffice.utils";
import { type TOutOfOfficeDelete } from "./outOfOfficeEntryDelete.schema";

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

  const deletedOutOfOfficeEntry = await prisma.outOfOfficeEntry.delete({
    where: {
      uuid: input.outOfOfficeUid,
      /** Validate outOfOfficeEntry belongs to the user deleting it or is admin*/
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
