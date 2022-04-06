import { ChatAltIcon } from "@heroicons/react/solid";
import Script from "next/script";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { DropdownMenuItem } from "@calcom/ui/Dropdown";

import classNames from "@lib/classNames";

const ZENDESK_KEY = process.env.NEXT_PUBLIC_ZENDESK_KEY;

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
                "h-5 w-5 flex-shrink-0 ltr:mr-3"
              )}
              aria-hidden="true"
            />
            {t("help")}
          </button>
        </DropdownMenuItem>
        {active && (
          <Script id="ze-snippet" src={"https://static.zdassets.com/ekr/snippet.js?key=" + ZENDESK_KEY} />
        )}
      </>
    );
}
