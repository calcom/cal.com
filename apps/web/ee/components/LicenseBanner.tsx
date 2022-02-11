import { XIcon } from "@heroicons/react/outline";
import { BadgeCheckIcon } from "@heroicons/react/solid";
import { Trans } from "react-i18next";

import { useLocale } from "@lib/hooks/useLocale";

import { Dialog, DialogTrigger } from "@components/Dialog";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";

export default function LicenseBanner() {
  const { t } = useLocale();
  /*
    Set this value to 'agree' to accept our license:
    LICENSE: https://github.com/calcom/cal.com/blob/main/LICENSE

    Summary of terms:
    - The codebase has to stay open source, whether it was modified or not
    - You can not repackage or sell the codebase
    - Acquire a commercial license to remove these terms by visiting: cal.com/sales
    NEXT_PUBLIC_LICENSE_CONSENT=''
  */
  if (process.env.NEXT_PUBLIC_LICENSE_CONSENT === "agree") {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 left-0 pb-2 sm:pb-5 md:left-56">
      <div className="mx-auto max-w-7xl px-2 sm:px-8">
        <div className="rounded-sm bg-green-600 p-2 shadow-lg sm:p-3">
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex w-0 flex-1 items-center">
              <span className="flex rounded-sm bg-green-800 p-2">
                <BadgeCheckIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </span>
              <p className="ml-3 truncate font-medium text-white">
                <span className="inline">
                  <Trans i18nKey="accept_our_license" values={{ agree: "agree" }}>
                    Accept our license by changing the .env variable
                    <span className="bg-gray-50 bg-opacity-20 px-1">NEXT_PUBLIC_LICENSE_CONSENT</span> to
                    &apos;agree&apos;.
                  </Trans>
                </span>
              </p>
            </div>
            <div className="order-3 mt-2 w-full flex-shrink-0 sm:order-2 sm:mt-0 sm:w-auto">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="flex w-full items-center justify-center rounded-sm border border-transparent bg-white px-4 py-2 text-sm font-medium text-green-600 shadow-sm hover:bg-green-50">
                    {t("accept_license")}
                  </button>
                </DialogTrigger>
                <DialogContent />
              </Dialog>
            </div>
            <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-2">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="-mr-1 flex rounded-sm p-2 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-white">
                    <span className="sr-only">{t("dismiss")}</span>
                    <XIcon className="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </DialogTrigger>
                <DialogContent />
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function DialogContent() {
    return (
      <ConfirmationDialogContent
        variety="success"
        title={t("open_env")}
        confirmBtnText={t("env_changed")}
        cancelBtnText={t("cancel")}>
        <Trans i18nKey="remove_banner_instructions" values={{ agree: "agree" }}>
          To remove this banner, please open your .env file and change the
          <span className="bg-green-400 bg-opacity-20 p-[2px] text-green-500">
            NEXT_PUBLIC_LICENSE_CONSENT
          </span>
          variable to &apos;agreeapos;.
        </Trans>
        <h2 className="font-cal mt-8 mb-2 text-black">{t("terms_summary")}:</h2>
        <ul className="ml-5 list-disc">
          <li>{t("codebase_has_to_stay_opensource")}</li>
          <li>{t("cannot_repackage_codebase")}</li>
          <li>
            {t("acquire_license")}:{" "}
            <a className="text-blue-500 underline" href="https://cal.com/sales">
              cal.com/sales
            </a>
          </li>
        </ul>
      </ConfirmationDialogContent>
    );
  }
}
