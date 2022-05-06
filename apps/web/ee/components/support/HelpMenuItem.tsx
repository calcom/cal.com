import { ChatAltIcon } from "@heroicons/react/solid";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Tooltip } from "@calcom/ui/Tooltip";

import classNames from "@lib/classNames";

import ContactMenuItem from "./ContactMenuItem";

export default function HelpMenuItem() {
  const { t } = useLocale();

  return (
    <>
      <button className="flex w-full px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-gray-100 hover:text-gray-900">
        <ChatAltIcon
          className={classNames(
            "text-neutral-400 group-hover:text-neutral-500",
            "h-5 w-5 flex-shrink-0 ltr:mr-3"
          )}
          aria-hidden="true"
        />
        {t("help")}
      </button>
      <ContactMenuItem />
    </>
  );
}
