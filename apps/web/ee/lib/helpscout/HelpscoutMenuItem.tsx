import { ChatAltIcon } from "@heroicons/react/solid";
import { useState } from "react";
import { HelpScout, useChat } from "react-live-chat-loader";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { DropdownMenuItem } from "@calcom/ui/Dropdown";

import classNames from "@lib/classNames";

export default function HelpscoutMenuItem() {
  const { t } = useLocale();
  const [active, setActive] = useState(false);

  const [state, loadChat] = useChat();

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
          className="flex w-full py-2 pr-4 text-sm font-medium text-neutral-700 hover:bg-gray-100 hover:text-gray-900">
          {t("contact_support")}
        </button>

        {active && <HelpScout color="#292929" icon="message" horizontalPosition="right" zIndex="1" />}
      </>
    );
}
