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
    - Acquire a commercial license to remove these terms by emailing: license@cal.com
    NEXT_PUBLIC_LICENSE_CONSENT=''
  */
  if (process.env.NEXT_PUBLIC_LICENSE_CONSENT === "agree") {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 left-0 pb-2 md:left-56 sm:pb-5">
      <div className="px-2 mx-auto max-w-7xl sm:px-8">
        <div className="p-2 bg-green-600 rounded-sm shadow-lg sm:p-3">
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex items-center flex-1 w-0">
              <span className="flex p-2 bg-green-800 rounded-sm">
                <BadgeCheckIcon className="w-6 h-6 text-white" aria-hidden="true" />
              </span>
              <p className="ml-3 font-medium text-white truncate">
                <span className="inline">
                  <Trans i18nKey="accept_our_license" values={{ agree: "agree" }}>
                    Accept our license by changing the .env variable
                    <span className="px-1 bg-gray-50 bg-opacity-20">NEXT_PUBLIC_LICENSE_CONSENT</span> to
                    &apos;agree&apos;.
                  </Trans>
                </span>
              </p>
            </div>
            <div className="flex-shrink-0 order-3 w-full mt-2 sm:order-2 sm:mt-0 sm:w-auto">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-green-600 bg-white border border-transparent rounded-sm shadow-sm hover:bg-green-50">
                    {t("accept_license")}
                  </button>
                </DialogTrigger>
                <DialogContent />
              </Dialog>
            </div>
            <div className="flex-shrink-0 order-2 sm:order-3 sm:ml-2">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="flex p-2 -mr-1 rounded-sm hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-white">
                    <span className="sr-only">{t("dismiss")}</span>
                    <XIcon className="w-6 h-6 text-white" aria-hidden="true" />
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
