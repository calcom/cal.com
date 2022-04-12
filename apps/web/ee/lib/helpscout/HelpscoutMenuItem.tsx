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
        <DropdownMenuItem>
          <button
            onClick={handleClick}
            className="flex w-full px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-gray-100 hover:text-gray-900">
            <ChatAltIcon
              className={classNames(
                "text-neutral-400 group-hover:text-neutral-500",
                "h-5 w-5 flex-shrink-0 ltr:mr-3"
              )}
              aria-hidden="true"
            />
            {t("help")}
          </button>
        </DropdownMenuItem>
        {active && <HelpScout color="#292929" icon="message" horizontalPosition="right" zIndex="1" />}
      </>
    );
}
