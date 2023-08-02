import type { Dispatch, SetStateAction } from "react";

import { SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dialog, DialogContent, DialogClose, DialogFooter } from "@calcom/ui";

export const KYCVerificationDialog = (props: {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  isPartOfTeam: boolean;
}) => {
  const { isOpenDialog, setIsOpenDialog, isPartOfTeam } = props;
  const { t } = useLocale();

  const teamOrAccount = isPartOfTeam ? "team" : "account";

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent title={t("verify_team_or_account", { teamOrAccount })}>
        <div>
          {t("kyc_verification_information", {
            supportEmail: SUPPORT_MAIL_ADDRESS === "help@cal.com" ? "support@cal.com" : SUPPORT_MAIL_ADDRESS,
            teamOrAccount,
          })}
        </div>
        <DialogFooter>
          <DialogClose />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
