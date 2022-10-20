import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { getSerializableForm } from "../../lib/getSerializableForm";
import { Response, SerializableForm } from "../../types/types";
import { App_RoutingForms_Form } from ".prisma/client";

function escapeCsvText(str: string) {
  return str.replace(/,/, "%2C");
}
async function* getResponses(
  formId: string,
  headerFields: NonNullable<SerializableForm<App_RoutingForms_Form>["fields"]>
) {
  let responses;
  let skip = 0;
  // Let's keep it high and observe at what point Vercel serverless fn limits are hit
  // There is an RFC to take care of things after that: https://linear.app/calcom/issue/CAL-204/rfc-routing-form-improved-csv-exports
  const take = 10000;
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
      const foundFields = {};
      headerFields.forEach((headerField) => {
        foundFields[headerField.id] = 1;
        const fieldResponse = fieldResponses[headerField.id];
        // if (fieldResponse) {
        //   csvLineColumns.push(escapeCsvText(fieldResponse.label));
        // } else {
        //   csvLineColumns.push("");
        // }
        // const label = escapeCsvText(fieldResponse.label);
        const value = fieldResponse.value;
        let serializedValue = "";
        if (value instanceof Array) {
          serializedValue = value.map((val) => escapeCsvText(val)).join(" | ");
        } else {
          serializedValue = escapeCsvText(value);
        }
        csvCells.push(serializedValue);
      });

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
  const serializableForm = getSerializableForm(form, true);
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
    headerFields.map((field) => `${field.label}${field.deleted ? "(Deleted)" : ""}`).join(",") + "\n"
  );

  for await (const partialCsv of csvIterator) {
    res.write(partialCsv);
    res.write("\n");
  }
  res.end();
}
