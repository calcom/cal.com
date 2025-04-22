import { createRouterCaller } from "app/_trpc/context";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import { ScheduleRepository } from "@calcom/lib/server/repository/schedule";
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

const getSchedule = cache((id: number) => ScheduleRepository.findScheduleById({ id }));

export const generateMetadata = async ({ params }: PageProps) => {
  const parsed = querySchema.safeParse(await params);
  if (!parsed.success) {
    notFound();
  }

  const schedule = await getSchedule(parsed.data.schedule);

  if (!schedule) {
    notFound();
  }

  return await _generateMetadata(
    (t) => (schedule.name ? `${schedule.name} | ${t("availability")}` : t("availability")),
    () => "",
    undefined,
    undefined,
    `/availability/${parsed.data.schedule}`
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
