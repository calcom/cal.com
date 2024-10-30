import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { parseICS } from "ical";
import prisma from "@calcom/prisma";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

const uploadSchema = z.object({
  userId: z.number(),
  icsFile: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, icsFile } = uploadSchema.parse(req.body);

  const parsedData = parseICS(icsFile);

  const dateOverrides = Object.values(parsedData).map((event: any) => ({
    date: event.start.toISOString().split("T")[0],
    startTime: event.start.getHours() * 60 + event.start.getMinutes(),
    endTime: event.end.getHours() * 60 + event.end.getMinutes(),
    userId,
  }));

  await prisma.dateOverride.createMany({
    data: dateOverrides,
  });

  res.status(200).json({ message: "ICS file processed successfully" });
}

export default defaultResponder(handler);
