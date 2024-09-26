import type { Dispatch, SetStateAction } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui";

interface IInstantCallDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
}

export const InstantCallDialog = (props: IInstantCallDialog) => {
  const { t } = useLocale();

  const { isOpenDialog, setIsOpenDialog } = props;

  return (
    <>
      <Dialog open={true} onOpenChange={setIsOpenDialog}>
        <DialogContent enableOverflow>
          <DialogHeader title={t("Incoming Call")} />
          <div>
            <p>Peer Richelsen is calling for a &quot;NAME OF EVENT TYPE&quot; meeting.</p>
            <p>You have n minutes and n seconds to accept.</p>
          </div>
          <DialogFooter>
            <div className="flex w-full justify-center gap-2">
              <Button type="button" className="border-[#DE4B2B] !bg-[#DE4B2B] text-white">
                {t("Ignore")}
              </Button>
              <Button StartIcon="phone" className="border-[#52B65A] !bg-[#52B65A] text-white">
                {t("Accept")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
        {/* TODO: Add programmatic way of triggering the audio without controls */}
        <audio controls src="/ringing.mp3">
          Your browser does not support the
          <code>audio</code> element.
        </audio>
      </Dialog>
    </>
  );
};
