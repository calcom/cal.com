import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

const RedirectPage = async () => {
  const req = {
    headers: Object.fromEntries((await headers()).entries()),
    cookies: Object.fromEntries((await cookies()).getAll().map((c) => [c.name, c.value])),
  } as any;
  const session = await getServerSession({ req });

  if (!session?.user?.id) {
    redirect("/auth/login");
  }
  redirect("/event-types");
};

export default RedirectPage;
