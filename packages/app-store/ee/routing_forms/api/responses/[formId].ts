import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { Response } from "../../pages/routing-link/[...appPages]";

function escapeCsvText(str: string) {
  return str.replace(/,/, "%2C");
}
async function* getResponses(formId: string) {
  let responses;
  let skip = 0;
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
    // Because fields can be added or removed at any time we can't have fixed columns.
    // Because there can be huge amount of data we can't keep all that in memory to identify columns from all the data at once.
    // TODO: So, for now add the field label in front of it. It certainly needs improvement.
    // TODO: Email CSV when we need to scale it.
    responses.forEach((response) => {
      const fieldResponses = response.response as Response;
      const csvLineColumns = [];
      for (const [, fieldResponse] of Object.entries(fieldResponses)) {
        const label = escapeCsvText(fieldResponse.label);
        const value = fieldResponse.value;
        let serializedValue = "";
        if (value instanceof Array) {
          serializedValue = value.map((val) => escapeCsvText(val)).join(" | ");
        } else {
          serializedValue = escapeCsvText(value);
        }
        csvLineColumns.push(`"Field Label :=> Value"`);
        csvLineColumns.push(`"${label} :=> ${serializedValue}"`);
      }
      csv.push(csvLineColumns.join(","));
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
  res.setHeader("Content-Type", "text/csv; charset=UTF-8");
  res.setHeader("Transfer-Encoding", "chunked");
  const csvIterator = getResponses(formId);
  for await (const partialCsv of csvIterator) {
    res.write(partialCsv);
    res.write("\n");
  }
  res.end();
}
