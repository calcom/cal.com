import type { App_RoutingForms_Form } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { getSerializableForm } from "../../lib/getSerializableForm";
import type { Response, SerializableForm } from "../../types/types";

function escapeCsvText(str: string) {
  return str.replace(/,/, "%2C");
}
async function* getResponses(
  formId: string,
  headerFields: NonNullable<SerializableForm<App_RoutingForms_Form>["fields"]>
) {
  let responses;
  let skip = 0;
  // Keep it small enough to be in Vercel limits of Serverless Function in terms of memory.
  // To avoid limit in terms of execution time there is an RFC https://linear.app/calcom/issue/CAL-204/rfc-routing-form-improved-csv-exports
  const take = 100;
  while (
    (responses = await prisma.app_RoutingForms_FormResponse.findMany({
      where: {
        formId,
      },
      take: take,
      skip: skip,
    })) &&
    responses.length
  ) {
    const csv: string[] = [];
    responses.forEach((response) => {
      const fieldResponses = response.response as Response;
      const csvCells: string[] = [];
      headerFields.forEach((headerField) => {
        const fieldResponse = fieldResponses[headerField.id];
        const value = fieldResponse?.value || "";
        let serializedValue = "";
        if (value instanceof Array) {
          serializedValue = value.map((val) => escapeCsvText(val)).join(" | ");
        } else {
          // value can be a number as well for type Number field
          serializedValue = escapeCsvText(String(value));
        }
        csvCells.push(serializedValue);
      });
      csvCells.push(response.createdAt.toISOString());
      csv.push(csvCells.join(","));
    });
    skip += take;
    yield csv.join("\n");
  }
  return "";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { args } = req.query;
  if (!args) {
    throw new Error("args must be set");
  }
  const formId = args[2];
  if (!formId) {
    throw new Error("formId must be provided");
  }

  const form = await prisma.app_RoutingForms_Form.findFirst({
    where: {
      id: formId,
    },
  });

  if (!form) {
    throw new Error("Form not found");
  }
  const serializableForm = await getSerializableForm(form, true);
  res.setHeader("Content-Type", "text/csv; charset=UTF-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${serializableForm.name}-${serializableForm.id}.csv"`
  );
  res.setHeader("Transfer-Encoding", "chunked");
  const headerFields = serializableForm.fields || [];
  const csvIterator = getResponses(formId, headerFields);

  // Make Header
  res.write(
    headerFields
      .map((field) => `${field.label}${field.deleted ? "(Deleted)" : ""}`)
      .concat(["Submission Time"])
      .join(",") + "\n"
  );

  for await (const partialCsv of csvIterator) {
    res.write(partialCsv);
    res.write("\n");
  }
  res.end();
}
