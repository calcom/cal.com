import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { ScheduleRepository } from "@calcom/lib/server/repository/schedule";

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

export default WithLayout({ getLayout: null, Page: AvailabilitySettingsWebWrapper });
