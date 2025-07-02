import { BotIdClient } from "botid/client";

export default function BotIdWidget() {
  if (process.env.NEXT_PUBLIC_IS_E2E) return null;

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
