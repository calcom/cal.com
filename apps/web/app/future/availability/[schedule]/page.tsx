import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { AvailabilitySettingsWebWrapper } from "~/availability/[schedule]/schedule-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const { trpc } = await import("@calcom/trpc");
  const scheduleId = params?.schedule ? Number(params.schedule) : -1;

  const { data: schedule } = trpc.viewer.availability.schedule.get.useQuery(
    { scheduleId },
    {
      enabled: !!scheduleId,
    }
  );

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
