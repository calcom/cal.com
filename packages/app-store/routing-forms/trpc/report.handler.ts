import type { PrismaClient } from "@prisma/client";

import logger from "@calcom/lib/logger";
import { TRPCError } from "@calcom/trpc/server";

import { jsonLogicToPrisma } from "../jsonLogicToPrisma";
import { getSerializableForm } from "../lib/getSerializableForm";
import type { Response } from "../types/types";
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
  const serializedForm = await getSerializableForm(form, true);

  const rows = await prisma.app_RoutingForms_FormResponse.findMany({
    where: {
      formId: input.formId,
      ...prismaWhere,
    },
    take,
    skip,
  });
  const fields = serializedForm?.fields || [];
  const headers = fields.map((f) => f.label + (f.deleted ? "(Deleted)" : ""));
  const responses: (string | number)[][] = [];
  rows.forEach((r) => {
    const rowResponses: (string | number)[] = [];
    responses.push(rowResponses);
    fields.forEach((field) => {
      if (!r.response) {
        return;
      }
      const response = r.response as Response;
      const value = response[field.id]?.value || "";
      let transformedValue;
      if (value instanceof Array) {
        transformedValue = value.join(", ");
      } else {
        transformedValue = value;
      }
      rowResponses.push(transformedValue);
    });
  });
  const areThereNoResultsOrLessThanAskedFor = !rows.length || rows.length < take;
  return {
    headers,
    responses,
    nextCursor: areThereNoResultsOrLessThanAskedFor ? null : skip + rows.length,
  };
};

export default reportHandler;
