"use client";

import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { validStatuses } from "~/bookings/lib/validStatuses";
import BookingsList from "~/bookings/views/bookings-listing-view";

const querySchema = z.object({
  status: z.enum(validStatuses),
});

const Page = () => {
  const { t } = useLocale();
  const params = useParams();
  const router = useRouter();
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    router.push("/bookings/upcoming");
    return;
  }

  return (
    <ShellMainAppDir heading={t("bookings")} subtitle={t("bookings_description")}>
      <BookingsList status={parsed.data.status} />
    </ShellMainAppDir>
  );
};

export default Page;
