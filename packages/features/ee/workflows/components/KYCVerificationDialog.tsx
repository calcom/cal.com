import type { Dispatch, SetStateAction } from "react";

import { SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dialog, DialogContent, DialogClose, DialogFooter } from "@calcom/ui";

export const KYCVerificationDialog = (props: {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
}) => {
  const { isOpenDialog, setIsOpenDialog } = props;
  const { t } = useLocale();

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent title={t("verify_team")}>
        <div>
          {t("kyc_verification_information", {
            supportEmail: SUPPORT_MAIL_ADDRESS,
          })}
        </div>
        <DialogFooter>
          <DialogClose />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
