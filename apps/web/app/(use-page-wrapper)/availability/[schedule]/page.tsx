import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { notFound } from "next/navigation";
import { z } from "zod";

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

  return <AvailabilitySettingsWebWrapper />;
};

export default Page;
