import { useSession } from "next-auth/react";

import { CAL_URL, WEBAPP_URL } from "@calcom/lib/constants";

export const useBookerUrl = () => {
  const { data: session } = useSession();
  return session?.user.org?.url ?? CAL_URL ?? WEBAPP_URL;
};
