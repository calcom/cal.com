import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";

interface InfoLostWarningDialog {
  isOpenInfoLostDialog: boolean;
  setIsOpenInfoLostDialog: Dispatch<SetStateAction<boolean>>;
  goToRoute: string;
}

const InfoLostWarningDialog = (props: InfoLostWarningDialog) => {
  const { t } = useLocale();
  const { isOpenInfoLostDialog, setIsOpenInfoLostDialog, goToRoute } = props;
  const router = useRouter();
  return (
    <Dialog open={isOpenInfoLostDialog} onOpenChange={setIsOpenInfoLostDialog}>
      <DialogContent
        title={t("leave_without_saving")}
        description={`${t("leave_without_saving_description")}`}
        Icon="circle-alert"
        enableOverflow
        type="confirmation">
        <DialogFooter className="mt-6">
          <Button
            onClick={() => {
              setIsOpenInfoLostDialog(false);
            }}
            color="minimal">
            {t("go_back_and_save")}
          </Button>
          <Button
            onClick={(e) => {
              setIsOpenInfoLostDialog(false);
              router.replace(goToRoute);
            }}>
            {t("leave_without_saving")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { InfoLostWarningDialog };
