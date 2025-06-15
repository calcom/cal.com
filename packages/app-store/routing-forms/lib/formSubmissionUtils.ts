import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";
import type { App_RoutingForms_Form } from "@calcom/prisma/client";
import { RoutingFormSettings } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import { onFormSubmission } from "../trpc/utils";
import type { FormResponse, SerializableForm } from "../types/types";

export type TargetRoutingFormForResponse = SerializableForm<
  App_RoutingForms_Form & {
    user: {
      id: number;
      email: string;
    };
    team: {
      parentId: number | null;
    } | null;
  }
>;

/**
 * A wrapper over onFormSubmission that handles building the data needed for onFormSubmission
 */
export const onSubmissionOfFormResponse = async ({
  form,
  formResponseInDb,
  chosenRouteAction,
}: {
  form: TargetRoutingFormForResponse;
  formResponseInDb: { id: number; response: Prisma.JsonValue };
  chosenRouteAction: {
    type: "customPageMessage" | "externalRedirectUrl" | "eventTypeRedirectUrl";
    value: string;
  } | null;
}) => {
  if (!form.fields) {
    // There is no point in submitting a form that doesn't have fields defined
    throw new TRPCError({
      code: "BAD_REQUEST",
    });
  }
  const settings = RoutingFormSettings.parse(form.settings);
  let userWithEmails: string[] = [];

  if (form.teamId && (settings?.sendToAll || settings?.sendUpdatesTo?.length)) {
    const whereClause: Prisma.MembershipWhereInput = { teamId: form.teamId };
    if (!settings?.sendToAll) {
      whereClause.userId = { in: settings.sendUpdatesTo };
    }
    const userEmails = await prisma.membership.findMany({
      where: whereClause,
      select: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });
    userWithEmails = userEmails.map((userEmail) => userEmail.user.email);
  }

  await onFormSubmission(
    { ...form, fields: form.fields, userWithEmails },
    formResponseInDb.response as FormResponse,
    formResponseInDb.id,
    chosenRouteAction ?? undefined
  );
};
