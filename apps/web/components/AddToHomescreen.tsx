import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { FiX } from "@calcom/ui/components/icon";

export default function AddToHomescreen() {
  const { t } = useLocale();
  const [closeBanner, setCloseBanner] = useState(false);

  if (typeof window !== "undefined") {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return null;
    }
  }
  return !closeBanner ? (
    <div className="fixed inset-x-0 bottom-0 pb-2 sm:hidden sm:pb-5">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="rounded-lg p-2 shadow-lg sm:p-3" style={{ background: "#2F333D" }}>
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex w-0 flex-1 items-center">
              <span className="bg-brand text-brandcontrast dark:bg-darkmodebrand dark:text-darkmodebrandcontrast flex rounded-lg bg-opacity-30 p-2">
                <svg
                  className="h-7 w-7 fill-current text-indigo-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 50 50"
                  enableBackground="new 0 0 50 50">
                  <path d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z" />
                  <path d="M24 7h2v21h-2z" />
                  <path d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z" />
                </svg>
              </span>
              <p className="text-xs font-medium text-white ltr:ml-3 rtl:mr-3">
                <span className="inline">{t("add_to_homescreen")}</span>
              </p>
            </div>

            <div className="order-2 flex-shrink-0 sm:order-3">
              <button
                onClick={() => setCloseBanner(true)}
                type="button"
                className="-mr-1 flex rounded-md p-2 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-white">
                <span className="sr-only">{t("dismiss")}</span>
                <FiX className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;
}
