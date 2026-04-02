import process from "node:process";
import { trpc } from "@calcom/trpc/react";
import Script from "next/script";
import { z } from "zod";

const nonEmptySchema = z.string().min(1);
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fcWidget: any;
  }
}

const host = process.env.NEXT_PUBLIC_FRESHCHAT_HOST;

const token = process.env.NEXT_PUBLIC_FRESHCHAT_TOKEN;

export const isFreshChatEnabled =
  nonEmptySchema.safeParse(host).success && nonEmptySchema.safeParse(token).success;

export default function FreshChatScript() {
  const { data } = trpc.viewer.me.get.useQuery();
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
