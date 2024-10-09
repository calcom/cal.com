import { getServerSession } from "next-auth";
import { cookies } from "next/headers";

import { getOptions } from "./next-auth-options";

export async function getServerSessionForAppDir() {
  return await getServerSession(
    getOptions({
      getDubId: () => cookies().get("dub_id")?.value || cookies().get("dclid")?.value,
    })
  );
}
