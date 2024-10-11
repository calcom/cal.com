import type { z } from "zod";

import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import { enrichFormWithMigrationData } from "../enrichFormWithMigrationData";
import { getSerializableForm } from "../lib/getSerializableForm";
import type { FormResponse } from "../types/types";
import type { ZFormByResponseIdInputSchema } from "./_router";

type GetResponseWithFormFieldsOptions = {
  ctx: {
    user: {
      id: number;
    };
  };
  input: z.infer<typeof ZFormByResponseIdInputSchema>;
};

async function getResponseWithFormFieldsHandler({ ctx, input }: GetResponseWithFormFieldsOptions) {
  const { user } = ctx;
  const { formResponseId } = input;

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
      message: "Form response not found",
    });
  }

  const form = formResponse.form;
  const { UserRepository } = await import("@calcom/lib/server/repository/user");
  const formWithUserProfile = {
    ...form,
    user: await UserRepository.enrichUserWithItsProfile({ user: form.user }),
  };

  //   if (formResponse.form.userId !== user.id) {
  //     throw new TRPCError({
  //       code: "FORBIDDEN",
  //       message: "You don't have access to this form response",
  //     });
  //   }

  return {
    response: formResponse.response as FormResponse,
    form: await getSerializableForm({ form: enrichFormWithMigrationData(formWithUserProfile) }),
  };
}

export default getResponseWithFormFieldsHandler;
