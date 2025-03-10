import { ShellMainAppDir } from "app/[lang]/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { redirect } from "next/navigation";
import { z } from "zod";

import { validStatuses } from "~/bookings/lib/validStatuses";
import BookingsList from "~/bookings/views/bookings-listing-view";

const querySchema = z.object({
  status: z.enum(validStatuses),
});

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);

  return await _generateMetadata(t("bookings"), t("bookings_description"));
};

const Page = async ({ params }: PageProps) => {
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    redirect("/bookings/upcoming");
  }
  const t = await getTranslate(params.lang);

  return (
    <ShellMainAppDir heading={t("bookings")} subtitle={t("bookings_description")}>
      <BookingsList status={parsed.data.status} />
    </ShellMainAppDir>
  );
};

export default Page;
