import Script from "next/script";
import { z } from "zod";

import { trpc } from "@calcom/trpc/react";

const nonEmptySchema = z.string().min(1);
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fcWidget: any;
  }
}

// eslint-disable-next-line turbo/no-undeclared-env-vars
const host = process.env.NEXT_PUBLIC_FRESHCHAT_HOST;
// eslint-disable-next-line turbo/no-undeclared-env-vars
const token = process.env.NEXT_PUBLIC_FRESHCHAT_TOKEN;

export const isFreshChatEnabled =
  nonEmptySchema.safeParse(host).success && nonEmptySchema.safeParse(token).success;

export default function FreshChatScript() {
  const { data } = trpc.viewer.me.useQuery();
  return (
    <Script
      id="fresh-chat-sdk"
      src="https://wchat.freshchat.com/js/widget.js"
      onLoad={() => {
        window.fcWidget.init({
          token,
          host,
          externalId: data?.id,
          lastName: data?.name,
          email: data?.email,
          meta: {
            username: data?.username,
          },
          open: true,
        });
      }}
    />
  );
}
