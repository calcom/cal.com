import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { ScheduleRepository } from "@calcom/lib/server/repository/schedule";
import { TravelScheduleRepository } from "@calcom/lib/server/repository/travelSchedule";
import prisma from "@calcom/prisma";
import { getDefaultScheduleId } from "@calcom/trpc/server/routers/viewer/availability/util";

import type { PageProps } from "../../../_types";
import { _generateMetadata } from "../../../_utils";
import { buildLegacyRequest } from "../../../lib/buildLegacyCtx";
import { AvailabilitySettingsWebWrapper } from "../../../modules/availability/[schedule]/schedule-view";

const querySchema = z.object({
  schedule: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "schedule must be a string that can be cast to a number",
    })
    .transform((val) => Number(val)),
});

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("availability"),
    () => "",
    undefined,
    undefined,
    "/availability"
  );
};

export const getCachedScheduleData = unstable_cache(
  async (scheduleId: number, userId: number, timeZone: string, defaultScheduleId: number | null) => {
    return await ScheduleRepository.findDetailedScheduleById({
      scheduleId,
      userId,
      timeZone,
      defaultScheduleId,
    });
  },
  ["schedule.findDetailedScheduleById"],
  { revalidate: 3600 } // Cache for 1 hour
);

export const getCachedTravelSchedulesData = unstable_cache(
  async (userId: number) => {
    return await TravelScheduleRepository.findTravelSchedulesByUserId(userId);
  },
  ["travelSchedule.findTravelSchedulesByUserId"],
  { revalidate: 3600 } // Cache for 1 hour
);

const Page = async ({ params }: PageProps) => {
  const parsed = querySchema.safeParse(await params);
  if (!parsed.success) {
    notFound();
  }
  const scheduleId = parsed.data.schedule;

  const session = await getServerSession({ req: buildLegacyRequest(headers(), cookies()) });

  if (!session?.user) {
    notFound();
  }

  const user = session.user as { id: number; timeZone?: string };
  if (!user.id) {
    notFound();
  }

  const userId = user.id;
  const userTimeZone = user.timeZone || "UTC";

  const defaultScheduleId = await getDefaultScheduleId(userId, prisma);

  const [scheduleData, travelSchedulesData] = await Promise.all([
    getCachedScheduleData(scheduleId, userId, userTimeZone, defaultScheduleId),
    getCachedTravelSchedulesData(userId),
  ]);

  if (!scheduleData) {
    notFound();
  }

  return (
    <AvailabilitySettingsWebWrapper scheduleData={scheduleData} travelSchedulesData={travelSchedulesData} />
  );
};

export default Page;
