import { ChatAltIcon } from "@heroicons/react/solid";

import { DropdownMenuItem } from "@calcom/ui/Dropdown";

import classNames from "@lib/classNames";
import { useLocale } from "@lib/hooks/useLocale";

import { useIntercom } from "./useIntercom";

export default function IntercomMenuItem() {
  const { t } = useLocale();
  const { boot, show } = useIntercom();
  if (!process.env.NEXT_PUBLIC_INTERCOM_APP_ID) return null;
  else
    return (
      <button
        onClick={() => {
          boot();
          show();
        }}
        className="flex w-full py-2 pr-4 text-sm font-medium text-neutral-700 hover:bg-gray-100 hover:text-gray-900">
        {t("contact_support")}
      </button>
    );
}
