import { getServerSession } from "next-auth";
import { cookies } from "next/headers";

export async function getServerSessionForAppDir() {
  return await getServerSession(getOptions({ getDclid: () => cookies().get("dclid")?.value }));
}
