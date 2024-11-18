import { redirect } from "next/navigation";

import { getServerSessionForAppDir } from "@calcom/features/auth/lib/get-server-session-for-app-dir";

const RedirectPage = async () => {
  const session = await getServerSessionForAppDir();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }
  redirect("/event-types");
};

export default RedirectPage;
