import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { redirect } from "next/navigation";
import { z } from "zod";

import { validStatuses } from "~/bookings/lib/validStatuses";
import BookingsList from "~/bookings/views/bookings-listing-view";

const querySchema = z.object({
  status: z.enum(validStatuses),
});

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("bookings"),
    (t) => t("bookings_description")
  );

export const generateStaticParams = async () => {
  return validStatuses.map((status) => ({ status }));
};

const Page = ({ params, searchParams }: PageProps) => {
  const parsed = querySchema.safeParse({ ...params, ...searchParams });
  if (!parsed.success) {
    redirect("/bookings/upcoming");
  }

  return <BookingsList status={parsed.data.status} />;
};

export default Page;
