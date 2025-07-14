import { sendBookingRedirectNotification } from "@calcom/emails";
import HrmsManager from "@calcom/lib/hrmsManager/hrmsManager";
import { getTranslation } from "@calcom/lib/server/i18n";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
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
      externalId: true,
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

  try {
    if (deletedOutOfOfficeEntry.externalId) {
      const hrmsCredentials = [];

      const userCredentials = await CredentialRepository.findManyByUserId({
        userId: oooUserId,
        appId: "deel",
      });
      hrmsCredentials.push(...userCredentials);

      const user = await prisma.user.findUnique({
        where: { id: oooUserId },
        select: {
          organizationId: true,
          teams: {
            select: { teamId: true },
          },
        },
      });

      if (user?.teams) {
        for (const team of user.teams) {
          const teamCredentials = await CredentialRepository.findManyByTeamId({ teamId: team.teamId });
          hrmsCredentials.push(...teamCredentials.filter((c) => c.appId === "deel"));
        }
      }

      if (user?.organizationId) {
        const orgCredentials = await CredentialRepository.findManyByOrganizationId({
          organizationId: user.organizationId,
        });
        hrmsCredentials.push(...orgCredentials.filter((c) => c.appId === "deel"));
      }

      for (const credential of hrmsCredentials) {
        if (credential.appId === "deel") {
          const hrmsManager = new HrmsManager(credential);
          await hrmsManager.deleteOOO(deletedOutOfOfficeEntry.externalId);
        }
      }
    }
  } catch (error) {
    console.error("Failed to delete HRMS time-off request:", error);
  }

  return {};
};
