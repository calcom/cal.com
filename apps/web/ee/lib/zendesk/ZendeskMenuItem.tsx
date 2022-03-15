import { ChatAltIcon } from "@heroicons/react/solid";
import { useState } from "react";

import ZendeskProvider from "@ee/lib/zendesk/ZendeskProvider";

import classNames from "@lib/classNames";
import { useLocale } from "@lib/hooks/useLocale";

import { DropdownMenuItem } from "@components/ui/Dropdown";

export default function ZendeskMenuItem() {
  const [active, setActive] = useState(false);
  const { t } = useLocale();

  if (!process.env.NEXT_PUBLIC_ZENDESK_KEY) return null;
  else
    return (
      <>
        <DropdownMenuItem>
          <button
            onClick={() => setActive(true)}
            className="flex w-full px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-gray-100 hover:text-gray-900">
            <ChatAltIcon
              className={classNames(
                "text-neutral-400 group-hover:text-neutral-500",
                "h-5 w-5 flex-shrink-0 ltr:mr-2"
              )}
              aria-hidden="true"
            />
            {t("help")}
          </button>
        </DropdownMenuItem>
        {active && <ZendeskProvider />}
      </>
    );
}
