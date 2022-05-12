import { ChatAltIcon, QuestionMarkCircleIcon, DocumentTextIcon, CodeIcon } from "@heroicons/react/solid";
import * as Dialog from "@radix-ui/react-dialog";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import classNames from "@lib/classNames";

import ContactMenuItem from "./ContactMenuItem";

export default function HelpMenuItem() {
  const { t } = useLocale();

  return (
    <div className="border-gray-300 bg-white p-5 shadow-sm ">
      <p className="mb-1 text-neutral-500">{t("resources").toUpperCase()}</p>
      <a
        href="https://docs.cal.com/"
        target="_blank"
        className="flex w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        rel="noreferrer">
        <DocumentTextIcon
          className={classNames(
            "text-neutral-400 group-hover:text-neutral-500",
            "h-5 w-5 flex-shrink-0 ltr:mr-3"
          )}
        />
        {t("support_documentation")}
      </a>
      <a
        href="https://developer.cal.com/"
        target="_blank"
        className="flex w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        rel="noreferrer">
        <CodeIcon
          className={classNames(
            "text-neutral-400 group-hover:text-neutral-500",
            "h-5 w-5 flex-shrink-0 ltr:mr-3"
          )}
        />
        {t("developer_documentation")}
      </a>
      {process.env.NEXT_PUBLIC_INTERCOM_APP_ID ||
        process.env.NEXT_PUBLIC_ZENDESK_KEY ||
        (process.env.NEXT_PUBLIC_HELPSCOUT_KEY && (
          <p className="mb-1 text-neutral-500">{t("get_in_touch").toUpperCase()}</p>
        ))}
      <ContactMenuItem />
    </div>
  );
}
