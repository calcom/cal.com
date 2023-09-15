import { Trans } from "next-i18next";
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

  const isTeamString = isPartOfTeam ? "team" : "";

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent title={t("verify_team_or_account", { teamOrAccount: isTeamString || "account" })}>
        <div>
          <div className="mb-4">
            <Trans
              i18nKey="kyc_verification_information"
              components={{
                a: (
                  <a
                    href={`mailto:support@cal.com?subject=${
                      isPartOfTeam ? "Team%20Verification" : "Account%20Verification"
                    }`}
                    style={{ color: "#3E3E3E" }}
                    target="_blank"
                    rel="noreferrer"
                  />
                ),
              }}
              values={{
                supportEmail:
                  SUPPORT_MAIL_ADDRESS === "help@cal.com" ? "support@cal.com" : SUPPORT_MAIL_ADDRESS,
                teamOrAccount: isTeamString || "account",
              }}
            />
          </div>
          <Trans
            i18nKey="kyc_verification_documents"
            components={{ li: <li />, ul: <ul className="ml-8 list-disc" /> }}
            values={{ teamOrUser: isPartOfTeam ? "team URL" : "user name" }}
          />
        </div>
        <DialogFooter>
          <DialogClose />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
