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
    } | null;
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

  if (form.user && !form.teamId) {
    userWithEmails = [form.user.email];
  } else if (form.teamId && (settings?.sendToAll || settings?.sendUpdatesTo?.length)) {
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
  } else if (form.user && form.teamId) {
    userWithEmails = [form.user.email];
  }

  if (form.user || userWithEmails.length > 0) {
    const effectiveUser = form.user || { id: -1, email: userWithEmails[0] };
    const effectiveUserWithEmails = form.user ? [form.user.email] : userWithEmails;

    await onFormSubmission(
      {
        ...form,
        fields: form.fields,
        userWithEmails: effectiveUserWithEmails,
        user: effectiveUser,
      },
      formResponseInDb.response as FormResponse,
      formResponseInDb.id,
      chosenRouteAction ?? undefined
    );
  }
};
