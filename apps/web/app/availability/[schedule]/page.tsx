import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

// import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import { ScheduleRepository } from "@calcom/lib/server/repository/schedule";

// import { TravelScheduleRepository } from "@calcom/lib/server/repository/travelSchedule";
// import { UserRepository } from "@calcom/lib/server/repository/user";
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

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const parsed = querySchema.safeParse({ ...params, ...searchParams });
  if (!parsed.success) {
    notFound();
  }

  const schedule = await getSchedule(parsed.data.schedule);

  if (!schedule) {
    notFound();
  }

  return await _generateMetadata(
    (t) => (schedule.name ? `${schedule.name} | ${t("availability")}` : t("availability")),
    () => ""
  );
};

const Page = async ({ params, searchParams }: PageProps) => {
  const parsed = querySchema.safeParse({ ...params, ...searchParams });
  if (!parsed.success) {
    notFound();
  }
  // const scheduleId = Number(params.schedule);

  // const session = await getServerSessionForAppDir();
  // const userId = session?.user?.id;
  // if (!userId) {
  //   notFound();
  // }

  // let userData, schedule, travelSchedules;

  // try {
  //   userData = await UserRepository.getTimeZoneAndDefaultScheduleId({
  //     userId,
  //   });
  //   if (!userData?.timeZone || !userData?.defaultScheduleId) {
  //     throw new Error("timeZone and defaultScheduleId not found");
  //   }
  // } catch (e) {
  //   notFound();
  // }

  // try {
  //   schedule = await ScheduleRepository.findDetailedScheduleById({
  //     scheduleId,
  //     isManagedEventType: false,
  //     userId,
  //     timeZone: userData.timeZone,
  //     defaultScheduleId: userData.defaultScheduleId,
  //   });
  // } catch (e) {}

  // try {
  //   travelSchedules = await TravelScheduleRepository.findTravelSchedulesByUserId(userId);
  // } catch (e) {}

  return (
    <AvailabilitySettingsWebWrapper

    // scheduleFetched={schedule} travelSchedules={travelSchedules}
    />
  );
};

export default WithLayout({ ServerPage: Page });
