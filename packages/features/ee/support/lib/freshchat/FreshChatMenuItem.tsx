import Script from "next/script";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

// eslint-disable-next-line turbo/no-undeclared-env-vars
const host = process.env.NEXT_PUBLIC_FRESHCHAT_HOST;
// eslint-disable-next-line turbo/no-undeclared-env-vars
const token = process.env.NEXT_PUBLIC_FRESHCHAT_TOKEN;

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fcWidget: any;
  }
}

export default function FreshChatMenuItem() {
  const { t } = useLocale();
  const { data } = trpc.viewer.me.useQuery();
  const [open, setOpen] = useState(false);

  if (!host || !token) return null;

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
        }}
        className="flex w-full px-5 py-2 pr-4 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900">
        {t("contact_support")}
      </button>

      {open && (
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
            });
          }}
        />
      )}
    </>
  );
}
