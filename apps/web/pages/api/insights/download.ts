import type { NextApiRequest, NextApiResponse } from "next";
import stream, { Readable } from "stream";
import { promisify } from "util";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { EventsInsights } from "@calcom/features/insights/server/events";
import { randomString } from "@calcom/lib/random";

const pipeline = promisify(stream.pipeline);

const EndpoingRequestQuerySchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  teamId: z.coerce.number().optional(),
  userId: z.coerce.number().optional(),
  memberUserId: z.coerce.number().optional(),
  isAll: z.coerce.boolean().optional(),
  eventTypeId: z.coerce.number().optional(),
});

export type EndpointRequestQuery = z.infer<typeof EndpoingRequestQuerySchema>;

type EndpointRequest = NextApiRequest & {
  query: EndpointRequestQuery;
};

/**
 * Reads a CSV string and returns it as a CSV file that can be downloaded.
 *
 * @param req
 * @param res
 *
 * @method GET
 *
 * @example /api/insights/download?csvAsString=1,2,3&downloadAs=data.csv
 */
export const downloadCSV = async (req: EndpointRequest, res: NextApiResponse): Promise<void> => {
  let data = {} as EndpointRequestQuery;
  try {
    // parse the query string using zod
    data = EndpoingRequestQuerySchema.parse(req.query as EndpointRequestQuery);
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ message: e.errors });
    }
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  try {
    const { startDate, endDate, teamId, userId, memberUserId, isAll } = data;

    const session = await getServerSession({ req, res });

    if (!session?.user?.id) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    // Determine if the user is allowed to access the data and what role
    if (isAll && !!!session.user.org) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    // Get the data
    const csvData = await EventsInsights.getCsvData({
      startDate,
      endDate,
      teamId,
      userId,
      memberUserId,
      isAll,
    });

    const csvAsString = objectToCsv(csvData);
    const downloadAs = `Insights-${dayjs(startDate).format("YYYY-MM-DD")}-${dayjs(endDate).format(
      "YYYY-MM-DD"
    )}-${randomString(10)}.csv`;

    res.setHeader("Content-Type", "application/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${downloadAs}`);

    res.status(200);
    await pipeline(Readable.from(Buffer.from(csvAsString)), res);
  } catch (e) {
    console.log(e);
    res.status(500);
    res.end();
  }
};

function objectToCsv(data: Record<string, unknown>[]) {
  // if empty data return empty string
  if (!data.length) {
    return "";
  }
  const header = Object.keys(data[0]).join(",") + "\n";
  const rows = data.map((obj: any) => Object.values(obj).join(",") + "\n");
  return header + rows.join("");
}

export default downloadCSV;
