import type { z } from "zod";

import { enrichFormWithMigrationData } from "@calcom/app-store/routing-forms/enrichFormWithMigrationData";
import { getSerializableForm } from "@calcom/app-store/routing-forms/lib/getSerializableForm";
import type { FormResponse } from "@calcom/app-store/routing-forms/types/types";
import { canAccessEntity } from "@calcom/lib/entityPermissionUtils.server";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { ZFormByResponseIdInputSchema } from "./_router";

type GetResponseWithFormFieldsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: z.infer<typeof ZFormByResponseIdInputSchema>;
};

async function getResponseWithFormFieldsHandler({ ctx, input }: GetResponseWithFormFieldsOptions) {
  const { user } = ctx;
  const { formResponseId } = input;
  const translate = await getTranslation(user.locale ?? "en", "common");

  const formResponse = await prisma.app_RoutingForms_FormResponse.findUnique({
    where: {
      id: formResponseId,
    },
    include: {
      form: {
        include: {
          user: {
            select: {
              id: true,
              movedToProfileId: true,
              organization: {
                select: {
                  slug: true,
                },
              },
              username: true,
              theme: true,
              brandColor: true,
              darkBrandColor: true,
              metadata: true,
            },
          },
          team: {
            select: {
              id: true,
              members: true,
              slug: true,
              parent: {
                select: { slug: true },
              },
              parentId: true,
              metadata: true,
            },
          },
        },
      },
    },
  });

  if (!formResponse) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: translate("form_response_not_found"),
    });
  }

  const form = formResponse.form;

  // TODO: To make the check stricter, we could check if the user is admin/owner of the team or a member that is the organizer.
  // But the exact criteria of showing a booking to the user could be trickier. Maybe we allow hosts as well to access the booking and thus should allow them as well to reroute
  if (!(await canAccessEntity(form, user.id))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: translate("you_dont_have_access_to_reroute_this_booking"),
    });
  }

  const { UserRepository } = await import("@calcom/features/users/repositories/UserRepository");
  const userRepo = new UserRepository(prisma);
  const formWithUserProfile = {
    ...form,
    user: await userRepo.enrichUserWithItsProfile({ user: form.user }),
  };

  return {
    response: formResponse.response as FormResponse,
    form: await getSerializableForm({ form: enrichFormWithMigrationData(formWithUserProfile) }),
  };
}

export default getResponseWithFormFieldsHandler;
