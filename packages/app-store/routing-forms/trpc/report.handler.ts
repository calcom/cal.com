import type { z } from "zod";

import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import type { App_RoutingForms_FormResponse } from "@calcom/prisma/client";
import { TRPCError } from "@calcom/trpc/server";

import { jsonLogicToPrisma } from "../jsonLogicToPrisma";
import { getSerializableForm } from "../lib/getSerializableForm";
import { ensureStringOrStringArray, getLabelsFromOptionIds } from "../lib/reportingUtils";
import type { FormResponse } from "../types/types";
import type { zodFieldView } from "../zod";
import type { TReportInputSchema } from "./report.schema";

interface ReportHandlerOptions {
  ctx: {
    prisma: PrismaClient;
  };
  input: TReportInputSchema;
}

export const reportHandler = async ({ ctx: { prisma }, input }: ReportHandlerOptions) => {
  // Can be any prisma `where` clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaWhere: Record<string, any> = input.jsonLogicQuery
    ? jsonLogicToPrisma(input.jsonLogicQuery)
    : {};
  const skip = input.cursor ?? 0;
  const take = 50;
  logger.debug(
    `Built Prisma where ${JSON.stringify(prismaWhere)} from jsonLogicQuery ${JSON.stringify(
      input.jsonLogicQuery
    )}`
  );
  const form = await prisma.app_RoutingForms_Form.findUnique({
    where: {
      id: input.formId,
    },
  });

  if (!form) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Form not found",
    });
  }
  // TODO: Second argument is required to return deleted operators.
  const serializedForm = await getSerializableForm({ form, withDeletedFields: true });

  const rows = await prisma.app_RoutingForms_FormResponse.findMany({
    where: {
      formId: input.formId,
      ...prismaWhere,
    },
    take,
    skip,
  });

  const fields = serializedForm?.fields || [];
  const { responses, headers } = buildResponsesForReporting({
    responsesFromDb: rows.map((r) => r.response),
    fields,
  });

  const areThereNoResultsOrLessThanAskedFor = !rows.length || rows.length < take;
  return {
    headers,
    responses,
    nextCursor: areThereNoResultsOrLessThanAskedFor ? null : skip + rows.length,
  };
};

export default reportHandler;

export function buildResponsesForReporting({
  responsesFromDb,
  fields,
}: {
  responsesFromDb: App_RoutingForms_FormResponse["response"][];
  fields: Pick<z.infer<typeof zodFieldView>, "id" | "options" | "label" | "deleted">[];
}) {
  const headers = fields.map((f) => f.label + (f.deleted ? "(Deleted)" : ""));
  const responses: string[][] = [];
  responsesFromDb.forEach((r) => {
    const rowResponses: string[] = [];
    responses.push(rowResponses);
    fields.forEach((field) => {
      if (!r) {
        return;
      }
      const response = r as FormResponse;
      const value = response[field.id]?.value || "";
      if (field.options) {
        const optionIds = ensureStringOrStringArray(value);
        const labels = getLabelsFromOptionIds({ options: field.options, optionIds });
        rowResponses.push(labels.join(", "));
      } else {
        const arrayOfValues = value instanceof Array ? value : [value];
        const transformedValue = arrayOfValues.join(", ");
        rowResponses.push(transformedValue);
      }
    });
  });

  return { responses, headers };
}
