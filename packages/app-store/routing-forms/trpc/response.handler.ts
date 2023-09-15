import { Prisma } from "@prisma/client";
import { z } from "zod";

import type { PrismaClient } from "@calcom/prisma";
import { TRPCError } from "@calcom/trpc/server";

import { getSerializableForm } from "../lib/getSerializableForm";
import type { Response } from "../types/types";
import type { TResponseInputSchema } from "./response.schema";
import { onFormSubmission } from "./utils";

interface ResponseHandlerOptions {
  ctx: {
    prisma: PrismaClient;
  };
  input: TResponseInputSchema;
}
export const responseHandler = async ({ ctx, input }: ResponseHandlerOptions) => {
  const { prisma } = ctx;
  try {
    const { response, formId } = input;
    const form = await prisma.app_RoutingForms_Form.findFirst({
      where: {
        id: formId,
      },
      include: {
        user: true,
      },
    });
    if (!form) {
      throw new TRPCError({
        code: "NOT_FOUND",
      });
    }

    const serializableForm = await getSerializableForm({ form });
    if (!serializableForm.fields) {
      // There is no point in submitting a form that doesn't have fields defined
      throw new TRPCError({
        code: "BAD_REQUEST",
      });
    }

    const serializableFormWithFields = {
      ...serializableForm,
      fields: serializableForm.fields,
    };

    const missingFields = serializableFormWithFields.fields
      .filter((field) => !(field.required ? response[field.id]?.value : true))
      .map((f) => f.label);

    if (missingFields.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Missing required fields ${missingFields.join(", ")}`,
      });
    }
    const invalidFields = serializableFormWithFields.fields
      .filter((field) => {
        const fieldValue = response[field.id]?.value;
        // The field isn't required at this point. Validate only if it's set
        if (!fieldValue) {
          return false;
        }
        let schema;
        if (field.type === "email") {
          schema = z.string().email();
        } else if (field.type === "phone") {
          schema = z.any();
        } else {
          schema = z.any();
        }
        return !schema.safeParse(fieldValue).success;
      })
      .map((f) => ({ label: f.label, type: f.type, value: response[f.id]?.value }));

    if (invalidFields.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid value for fields ${invalidFields
          .map((f) => `'${f.label}' with value '${f.value}' should be valid ${f.type}`)
          .join(", ")}`,
      });
    }

    const dbFormResponse = await prisma.app_RoutingForms_FormResponse.create({
      data: input,
    });

    await onFormSubmission(serializableFormWithFields, dbFormResponse.response as Response);
    return dbFormResponse;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        throw new TRPCError({
          code: "CONFLICT",
        });
      }
    }
    throw e;
  }
};

export default responseHandler;
