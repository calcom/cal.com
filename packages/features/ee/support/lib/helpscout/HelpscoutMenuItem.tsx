import { useState } from "react";
import { HelpScout, useChat } from "react-live-chat-loader";

import { useLocale } from "@calcom/lib/hooks/useLocale";

export default function HelpscoutMenuItem() {
  const { t } = useLocale();
  const [active, setActive] = useState(false);

  const [, loadChat] = useChat();

  function handleClick() {
    setActive(true);
    loadChat({ open: true });
  }

  if (!process.env.NEXT_PUBLIC_HELPSCOUT_KEY) return null;
  else
    return (
      <>
        <button
          onClick={handleClick}
          className="flex w-full px-5 py-2 pr-4 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900">
          {t("contact_support")}
        </button>

        {active && <HelpScout color="#292929" icon="message" horizontalPosition="right" zIndex="1" />}
      </>
    );
}
