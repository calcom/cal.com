import { redirect } from "next/navigation";

import { getServerSession } from "@lib/getServerSession";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (session.user.role !== "ADMIN") {
    redirect("/settings");
  }

  return children;
}
