import type { z } from "zod";

import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import type { App_RoutingForms_FormResponse } from "@calcom/prisma/client";
import { TRPCError } from "@calcom/trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { jsonLogicToPrisma } from "../jsonLogicToPrisma";
import { getSerializableForm } from "../lib/getSerializableForm";
import { ensureStringOrStringArray, getLabelsFromOptionIds } from "../lib/reportingUtils";
import type { FormResponse } from "../types/types";
import type { zodFieldView } from "../zod";
import type { TReportInputSchema } from "./report.schema";

interface ReportHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  input: TReportInputSchema;
}

const makeFormatDate = (locale: string, timeZone: string) => {
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };
  return formatDate;
};

const getRows = async ({ ctx: { prisma }, input }: ReportHandlerOptions) => {
  // Can be any prisma `where` clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaWhere: Record<string, any> = input.jsonLogicQuery
    ? jsonLogicToPrisma(input.jsonLogicQuery)
    : {};
  const skip = input.cursor ?? 0;
  const take = input.limit ? input.limit + 1 : 50;

  logger.debug(
    `Built Prisma where ${JSON.stringify(prismaWhere)} from jsonLogicQuery ${JSON.stringify(
      input.jsonLogicQuery
    )}`
  );
  const rows = await prisma.app_RoutingForms_FormResponse.findMany({
    where: {
      formId: input.formId,
      ...prismaWhere,
    },
    include: {
      routedToBooking: {
        select: {
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true },
          },
          assignmentReason: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take,
    skip,
  });
  return { skip, take, rows };
};

export const reportHandler = async (options: ReportHandlerOptions) => {
  const {
    ctx: { prisma },
    input,
  } = options;
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
  const { rows, skip, take } = await getRows(options);

  const fields = serializedForm?.fields || [];
  const { responses, headers } = buildResponsesForReporting({
    responsesFromDb: rows.map((r) => r.response),
    fields,
  });

  const areThereNoResultsOrLessThanAskedFor = !rows.length || rows.length < take;
  return presenter({
    rows,
    options,
    headers,
    responses,
    nextCursor: areThereNoResultsOrLessThanAskedFor ? null : skip + rows.length,
  });
};

/**
 * This is a temporary solution to make the report work. It should be incorporated into the report data itself.
 * Right now we cannot filter by Routed To and Booked At because they are not part of the response data.
 */
function presenter(args: {
  rows: Awaited<ReturnType<typeof getRows>>["rows"];
  options: ReportHandlerOptions;
  headers: string[];
  responses: string[][];
  nextCursor: number | null;
}) {
  const { headers, responses, nextCursor, options, rows } = args;
  const { ctx } = options;
  const formatDate = makeFormatDate(ctx.user.locale, ctx.user.timeZone);
  return {
    nextCursor,
    headers: [...headers, "Routed To", "Assignment Reason", "Booked At", "Submitted At"],
    responses: responses.map((r, i) => {
      const currentRow = rows[i];
      return [
        ...r,
        currentRow.routedToBooking?.user?.email || "",
        currentRow.routedToBooking?.assignmentReason.length
          ? currentRow.routedToBooking.assignmentReason[0].reasonString
          : "",
        currentRow.routedToBooking?.createdAt ? formatDate(currentRow.routedToBooking.createdAt) : "",
        formatDate(currentRow.createdAt),
      ];
    }),
  };
}

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
