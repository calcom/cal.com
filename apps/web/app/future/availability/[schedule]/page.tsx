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
  if (params?.schedule) {
    notFound();
  }
  const scheduleId = Number(params.schedule);

  const session = await getServerSession(AUTH_OPTIONS);
  const userId = session?.user?.id;
  if (!userId) {
    notFound();
  }

  let userData, schedule, travelSchedules;

  try {
    userData = await UserRepository.findById({
      id: userId,
      select: {
        timeZone: true,
        defaultScheduleId: true,
      },
    });
    if (!userData?.timeZone || !userData?.defaultScheduleId) {
      throw new Error("timeZone and defaultScheduleId not found");
    }
  } catch (e) {
    notFound();
  }

  try {
    schedule = await ScheduleRepository.findDetailedScheduleById({
      scheduleId,
      isManagedEventType: false,
      userId,
      timeZone: userData.timeZone,
      defaultScheduleId: userData.defaultScheduleId,
    });
  } catch (e) {}

  try {
    travelSchedules = await TravelScheduleRepository.findTravelSchedulesByUserId(userId);
  } catch (e) {}

  return <AvailabilitySettingsWebWrapper scheduleFetched={schedule} travelSchedules={travelSchedules} />;
};

export default WithLayout({ ServerPage: Page });
