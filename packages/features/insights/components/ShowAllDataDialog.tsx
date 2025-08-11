"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dialog, DialogContent, DialogClose } from "@calcom/ui/components/dialog";

interface ShowAllDataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const ShowAllDataDialog = ({ isOpen, onClose, title, children }: ShowAllDataDialogProps) => {
  const { t } = useLocale();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent title={title} size="lg" enableOverflow className="max-h-[80vh]">
        <div className="mt-4">{children}</div>
        <div className="mt-6 flex justify-end">
          <DialogClose onClick={onClose}>{t("close")}</DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};
