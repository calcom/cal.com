import type { z } from "zod";

import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
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

async function getRows({ ctx: { prisma, user }, input }: ReportHandlerOptions) {
  const formatDate = makeFormatDate(user.locale, user.timeZone);
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
        },
      },
    },
    take,
    skip,
  });
  return {
    skip,
    take,
    rows: rows.map((r) => ({
      ...r,
      routedToBooking: r.routedToBooking
        ? { ...r.routedToBooking, createdAt: formatDate(r.routedToBooking.createdAt) }
        : null,
    })),
  };
}

type Rows = Awaited<ReturnType<typeof getRows>>["rows"];

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

  const { skip, take, rows } = await getRows(options);

  const fields = serializedForm?.fields || [];
  const { responses, headers } = buildResponsesForReporting({
    responsesFromDb: rows,
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
  responsesFromDb: Rows;
  fields: Pick<z.infer<typeof zodFieldView>, "id" | "options" | "label" | "deleted">[];
}) {
  const headers = fields.map((f) => f.label + (f.deleted ? "(Deleted)" : ""));
  headers.push("Routed To");
  headers.push("Booked At");
  const responses: string[][] = [];
  responsesFromDb.forEach((r) => {
    const rowResponses: string[] = [];
    responses.push(rowResponses);
    fields.forEach((field) => {
      if (!r) {
        return;
      }
      const response = r.response as FormResponse;
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
    rowResponses.push(r.routedToBooking ? r.routedToBooking?.user?.email || "" : "");
    rowResponses.push(r.routedToBooking?.createdAt || "");
  });

  return { responses, headers };
}
