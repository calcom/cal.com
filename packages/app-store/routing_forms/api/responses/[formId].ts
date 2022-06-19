import { take } from "lodash";
import type { NextApiRequest, NextApiResponse } from "next";
import { responses } from "routing_forms/api";

import prisma from "@calcom/prisma";

async function* getResponses(formId) {
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
    const csv = [];
    // Because attributes can be added or removed at any time we can't have fixed columns.
    // Because there can be huge amount of data we can't keep all that in memory to identify columns from all the data at once.
    // TODO: So, for now add the field label in front of it. It certainly needs improvement.
    // TODO: Email CSV when we need to scale it.
    responses.forEach((response) => {
      const fieldResponses = response.response;
      const csvLine = [];
      for (const [, fieldResponse] of Object.entries(fieldResponses)) {
        const label = fieldResponse.label.replace(/,/, "%2C");
        const value = fieldResponse.value.replace(/,/, "%2C");
        csvLine.push(`${label}: ${value}`);
      }
      csv.push(csvLine.join(","));
    });
    skip += take;
    yield csv.join("\n");
  }
  return "";
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { args } = req.query;
  const [, , formId] = args;
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
  res.send();
}
