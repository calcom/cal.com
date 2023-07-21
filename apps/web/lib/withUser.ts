import type { Session } from "next-auth";

import { getServerSession } from "@lib/getServerSession";

export function withUser<T>(action: (session: Session) => Promise<T>) {
  return async () => {
    const session = await getServerSession();
    if (!session) {
      throw new Error("No session found");
    }

    return action(session);
  };
}
