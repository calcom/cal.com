import { ChatAltIcon, QuestionMarkCircleIcon, DocumentTextIcon, CodeIcon } from "@heroicons/react/solid";
import * as Popover from "@radix-ui/react-popover";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import classNames from "@lib/classNames";

import ContactMenuItem from "./ContactMenuItem";

export default function HelpMenuItem() {
  const { t } = useLocale();

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="flex w-full px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-gray-100 hover:text-gray-900">
          <QuestionMarkCircleIcon
            className={classNames(
              "text-gray-500 group-hover:text-neutral-500",
              "h-5 w-5 flex-shrink-0 ltr:mr-3"
            )}
            aria-hidden="true"
          />

          {t("help")}
        </button>
      </Popover.Trigger>
      <Popover.Content side="right">
        <div className="border-gray-300 bg-white p-5 shadow-sm ">
          <p className="mb-1 text-neutral-500">RESOURCES</p>
          <a
            href="https://docs.cal.com/"
            target="_blank"
            className="flex w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            rel="noreferrer">
            <DocumentTextIcon className="h-5 w-5 flex-shrink-0 ltr:mr-3" />
            Support documentation
          </a>
          <a
            href="https://developer.cal.com/"
            target="_blank"
            className="flex w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            rel="noreferrer">
            <CodeIcon className="h-5 w-5 flex-shrink-0 ltr:mr-3" />
            Developer documentation
          </a>
          <p className="mb-1 text-neutral-500">GET IN TOUCH</p>
          <ChatAltIcon
            className={classNames(
              "text-neutral-400 group-hover:text-neutral-500",
              "h-5 w-5 flex-shrink-0 ltr:mr-3"
            )}
            aria-hidden="true"
          />
          <ContactMenuItem />
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
