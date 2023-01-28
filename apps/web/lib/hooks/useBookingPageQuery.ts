import { z } from "zod";

import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { trpc } from "@calcom/trpc";

const bookingPageQuerySchema = z.object({
  duration: z.string().optional(),
  bookingUid: z.string().optional(),
  count: z.string().optional(),
  embed: z.string().optional(),
  rescheduleUid: z.string().optional(),
  type: z.string(),
  user: z.string(),
});

export const useBookingPageParams = () => useTypedQuery(bookingPageQuerySchema);

export const useBookingPageQuery = () => {
  const { data: routerQuery } = useBookingPageParams();
  return trpc.viewer.public.bookingPage.useQuery(routerQuery);
};
