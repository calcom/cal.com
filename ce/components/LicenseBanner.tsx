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
    LICENSE: https://github.com/calendso/calendso/blob/main/LICENSE

    Summary of terms:
    - The codebase has to stay open source, whether it was modified or not
    - You can not repackage or sell the codebase
    - Acquire a commercial license to remove these terms by emailing: license@cal.com
    NEXT_PUBLIC_LICENSE_CONSENT=''
  */
  if (process.env.NEXT_PUBLIC_LICENSE_CONSENT === "agree") {
    return null;
  }

  return (
    <div className="fixed left-0 md:left-56 bottom-0 inset-x-0 pb-2 sm:pb-5">
      <div className="max-w-7xl mx-auto px-2 sm:px-8">
        <div className="p-2 rounded-sm bg-green-600 shadow-lg sm:p-3">
          <div className="flex items-center justify-between flex-wrap">
            <div className="w-0 flex-1 flex items-center">
              <span className="flex p-2 rounded-sm bg-green-800">
                <BadgeCheckIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </span>
              <p className="ml-3 font-medium text-white truncate">
                <span className="inline">
                  <Trans i18nKey="accept_our_license" values={{ agree: "agree" }}>
                    Accept our license by changing the .env variable{" "}
                    <span className="bg-gray-50 bg-opacity-20 px-1">NEXT_PUBLIC_LICENSE_CONSENT</span> to
                    &apos;agree&apos;.
                  </Trans>
                </span>
              </p>
            </div>
            <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="rounded-sm w-full flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium text-green-600 bg-white hover:bg-green-50">
                    {t("accept_license")}
                  </button>
                </DialogTrigger>
                <DialogContent />
              </Dialog>
            </div>
            <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-2">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="-mr-1 flex p-2 rounded-sm hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-white">
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
          To remove this banner, please open your .env file and change the{" "}
          <span className="bg-green-400 text-green-500 bg-opacity-20 p-[2px]">
            NEXT_PUBLIC_LICENSE_CONSENT
          </span>{" "}
          variable to &apos;agreeapos;.
        </Trans>
        <h2 className="mt-8 mb-2 text-black font-cal">{t("terms_summary")}:</h2>
        <ul className="ml-5 list-disc">
          <li>{t("codebase_has_to_stay_opensource")}</li>
          <li>{t("cannot_repackage_codebase")}</li>
          <li>
            {t("acquire_license")}:{" "}
            <a className="text-blue-500 underline" href="mailto:license@cal.com">
              license@cal.com
            </a>
          </li>
        </ul>
      </ConfirmationDialogContent>
    );
  }
}
