import { useSession } from "next-auth/react";
import { useEffect } from "react";
import type { ZodSchema } from "zod";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";

export const useCurrentEmail = (querySchema: ZodSchema) => {
  const { data: session } = useSession();
  const searchParams = useCompatSearchParams();
  const routerQuery = useRouterQuery();

  const { isSuccessBookingPage, email: routerQueryEmail } = querySchema.parse(routerQuery);

  const paramEmail = searchParams?.get("rescheduledBy") ?? searchParams?.get("cancelledBy");

  useEffect(() => {
    if (isSuccessBookingPage && routerQueryEmail) {
      localStorage.setItem("currentEmail", routerQueryEmail);
    }
  }, [isSuccessBookingPage, routerQueryEmail]);

  if (paramEmail) return paramEmail;
  if (session?.user?.email) return session.user.email;
  if (isSuccessBookingPage) return routerQueryEmail;

  return localStorage.getItem("currentEmail") ?? undefined;
};
