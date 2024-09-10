import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import { AUTH_OPTIONS } from "@calcom/features/auth/lib/next-auth-options";
import { ScheduleRepository } from "@calcom/lib/server/repository/schedule";
import { TravelScheduleRepository } from "@calcom/lib/server/repository/travelSchedule";
import { UserRepository } from "@calcom/lib/server/repository/user";

import { AvailabilitySettingsWebWrapper } from "~/availability/[schedule]/schedule-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const scheduleId = params?.schedule ? Number(params.schedule) : -1;
  const schedule = await ScheduleRepository.findScheduleById({ id: scheduleId });

  if (!schedule) {
    return await _generateMetadata(
      (t) => t("availability"),
      () => ""
    );
  }

  return await _generateMetadata(
    (t) => (schedule.name ? `${schedule.name} | ${t("availability")}` : t("availability")),
    () => ""
  );
};

const Page = async ({ params }: PageProps) => {
  const session = await getServerSession(AUTH_OPTIONS);
  const userId = session?.user?.id ?? -1;
  let userData, schedule, travelSchedules;

  try {
    userData = await UserRepository.findById({
      id: userId,
      select: {
        timeZone: true,
        defaultScheduleId: true,
      },
    });
  } catch (e) {
    notFound();
  }

  const scheduleId = params?.schedule ? Number(params.schedule) : -1;
  try {
    schedule = await ScheduleRepository.findDetailedScheduleById({
      scheduleId,
      isManagedEventType: false,
      userId,
      timeZone: userData?.timeZone ?? "Europe/London",
      defaultScheduleId: userData?.defaultScheduleId ?? -1,
    });
  } catch (e) {}

  try {
    travelSchedules = await TravelScheduleRepository.findTravelSchedulesByUserId(userId);
  } catch (e) {}

  return <AvailabilitySettingsWebWrapper schedule={schedule} travelSchedules={travelSchedules} />;
};

export default WithLayout({ ServerPage: Page });
