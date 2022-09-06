import { Trans } from "next-i18next";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import Button from "./Button";
import { Dialog, DialogClose, DialogContent } from "./Dialog";
import { Icon } from "./Icon";

export function UpgradeToProDialog({
  modalOpen,
  setModalOpen,
  children,
}: {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  return (
    <Dialog open={modalOpen}>
      <DialogContent>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
          <Icon.FiAlertTriangle className="h-6 w-6 text-yellow-400" aria-hidden="true" />
        </div>
        <div className="mb-4 sm:flex sm:items-start">
          <div className="mt-3 sm:mt-0 sm:text-left">
            <h3 className="font-cal text-lg font-bold leading-6 text-gray-900" id="modal-title">
              {t("only_available_on_pro_plan")}
            </h3>
          </div>
        </div>
        <div className="flex flex-col space-y-3">
          <p>{children}</p>
          <p>
            <Trans i18nKey="plan_upgrade_instructions">
              You can
              <a href="/api/upgrade" className="underline">
                upgrade here
              </a>
              .
            </Trans>
          </p>
        </div>
        <div className="mt-5 gap-x-2 sm:mt-4 sm:flex sm:flex-row-reverse">
          <DialogClose asChild>
            <Button className="table-cell w-full text-center" onClick={() => setModalOpen(false)}>
              {t("dismiss")}
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
