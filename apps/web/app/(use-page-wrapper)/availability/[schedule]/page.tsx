import { createRouterCaller } from "app/_trpc/context";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { notFound } from "next/navigation";
import { z } from "zod";

import { availabilityRouter } from "@calcom/trpc/server/routers/viewer/availability/_router";
import { travelSchedulesRouter } from "@calcom/trpc/server/routers/viewer/travelSchedules/_router";

import { AvailabilitySettingsWebWrapper } from "~/availability/[schedule]/schedule-view";

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

const Page = async ({ params }: PageProps) => {
  const parsed = querySchema.safeParse(await params);
  if (!parsed.success) {
    notFound();
  }
  const scheduleId = parsed.data.schedule;

  const [availabilityCaller, travelSchedulesCaller] = await Promise.all([
    createRouterCaller(availabilityRouter),
    createRouterCaller(travelSchedulesRouter),
  ]);

  const [scheduleData, travelSchedulesData] = await Promise.all([
    availabilityCaller.schedule.get({ scheduleId }),
    travelSchedulesCaller.get(),
  ]);

  if (!scheduleData) {
    notFound();
  }

  return (
    <AvailabilitySettingsWebWrapper scheduleData={scheduleData} travelSchedulesData={travelSchedulesData} />
  );
};

export default Page;
