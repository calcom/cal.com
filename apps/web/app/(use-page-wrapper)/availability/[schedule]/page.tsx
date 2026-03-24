import { createRouterCaller } from "app/_trpc/context";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { availabilityRouter } from "@calcom/trpc/server/routers/viewer/availability/_router";
import { travelSchedulesRouter } from "@calcom/trpc/server/routers/viewer/travelSchedules/_router";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

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
  const _headers = await headers();
  const _cookies = await cookies();
  const session = await getServerSession({ req: buildLegacyRequest(_headers, _cookies) });
  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

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
  if (scheduleData.userId !== session.user.id) {
    return redirect("/availability");
  }

  return (
    <AvailabilitySettingsWebWrapper scheduleData={scheduleData} travelSchedulesData={travelSchedulesData} />
  );
};

export default Page;
