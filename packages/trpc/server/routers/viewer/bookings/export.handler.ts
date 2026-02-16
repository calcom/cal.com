import { dispatcher } from "@calid/job-dispatcher";
import type { BookingExportJobData } from "@calid/job-engine/types";
import { QueueName, JobName } from "@calid/queue";

import { getTranslation } from "@calcom/lib/server/i18n";
import type { PrismaClient } from "@calcom/prisma";

import type { TExportInputSchema } from "./export.schema";

type ExportOptions = {
  ctx: {
    user: {
      id: number;
      name: string | null;
      email: string;
      timeZone: string;
      timeFormat: number | null;
      locale: string;
    };
    prisma: PrismaClient;
  };
  input: TExportInputSchema;
};

export const exportHandler = async ({ ctx, input }: ExportOptions) => {
  const {
    user: { id, email, timeFormat, timeZone, locale, name },
  } = ctx;
  const t = await getTranslation(locale ?? "en", "common");

  const payload: BookingExportJobData = {
    user: { id, name, email, timeFormat, timeZone },
    filters: input.filters,
  };

  await dispatcher.dispatch({
    queue: QueueName.DATA_SYNC,
    name: JobName.BOOKING_EXPORT,
    data: payload,
    options: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
      removeOnComplete: {
        age: 86400, // 24 hours
        count: 100,
      },
      removeOnFail: {
        age: 604800, // 7 days
        count: 1000,
      },
    },
  });

  return { message: t("export_booking_response") };
};
