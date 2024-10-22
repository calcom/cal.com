import { UserRepository } from "@calcom/lib/server/repository/user";
import { prisma } from "@calcom/prisma";

import { enrichFormWithMigrationData } from "../enrichFormWithMigrationData";
import { getHumanReadableResponseForForm } from "../trpc/utils";
import type { FormResponse } from "../types/types";
import { getSerializableForm } from "./getSerializableForm";

export const findResponseWithFormFields = async (
  lookup: { formResponseId: number } | { bookingUid: string }
) => {
  const formResponse = await prisma.app_RoutingForms_FormResponse.findUnique({
    where: {
      ...(lookup.formResponseId ? { id: lookup.formResponseId } : { routedToBookingUid: lookup.bookingUid }),
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
    throw new Error("Form response not found");
  }

  const form = formResponse.form;

  const formWithUserProfile = {
    ...form,
    user: await UserRepository.enrichUserWithItsProfile({ user: form.user }),
  };

  return {
    response: formResponse.response as FormResponse,
    form: await getSerializableForm({ form: enrichFormWithMigrationData(formWithUserProfile) }),
  };
};

export const findHumanReadableRoutingFormResponse = async ({
  formResponseId,
}: {
  formResponseId: number;
}) => {
  const { response, form } = await findResponseWithFormFields({ formResponseId });

  return getHumanReadableResponseForForm({ response, form });
};

export const findHumanReadableRoutingFormResponseForBooking = async ({
  bookingUid,
}: {
  bookingUid: string;
}) => {
  const { response, form } = await findResponseWithFormFields({ bookingUid });

  return getHumanReadableResponseForForm({ response, form });
};
