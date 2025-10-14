import { useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

import { Dialog, DialogContent } from "@calcom/ui/components/dialog";

interface IGroupMeetingDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  link: string;
}

export const GroupMeetingDialog = ({ isOpenDialog, setIsOpenDialog, link }: IGroupMeetingDialog) => {
  const [loading, setLoading] = useState(true);

  const handleMessage = (event: MessageEvent) => {
    if (event.data === "close-dialog") {
      setIsOpenDialog(false);
    }
  };

  const handleLoad = () => {
    setLoading(false);
  };

  useEffect(() => {
    if (isOpenDialog) {
      window.addEventListener("message", handleMessage);
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [isOpenDialog]);
  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent size="xl">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <div className="loader" />
          </div>
        )}
        <iframe src={link} className="h-[850px] pb-8" title="Embedded Content" onLoad={handleLoad} />
      </DialogContent>
    </Dialog>
  );
};
