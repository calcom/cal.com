import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { AUTH_OPTIONS } from "@calcom/features/auth/lib/next-auth-options";

const RedirectPage = async () => {
  const session = await getServerSession(AUTH_OPTIONS);
  if (!session?.user?.id) {
    redirect("/auth/login");
  }
  redirect("/event-types");
};

export default RedirectPage;
