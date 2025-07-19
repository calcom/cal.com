import { BotIdClient } from "botid/client";

import { NEXT_PUBLIC_BOTID_ENABLED } from "@calcom/lib/constants";

export default function BotIdWidget() {
  if (process.env.NEXT_PUBLIC_IS_E2E) return null;

  if (!NEXT_PUBLIC_BOTID_ENABLED || NEXT_PUBLIC_BOTID_ENABLED !== "1") return null;

  return (
    <BotIdClient
      protect={[
        { path: "/api/auth/signup", method: "POST" },
        { path: "/api/book/event", method: "POST" },
        { path: "/api/book/recurring-event", method: "POST" },
      ]}
    />
  );
}
