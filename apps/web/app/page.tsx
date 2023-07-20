import { redirect } from "next/navigation";

import { getServerSession } from "@lib/getServerSession";

export default async function RedirectPage() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }
  redirect("/event-types");
}
