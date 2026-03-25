"use client";

import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@calid/features/ui/components/dialog";
import { Trash2 } from "lucide-react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

interface DeleteContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  onConfirm: () => Promise<void> | void;
  isDeleting?: boolean;
  errorMessage?: string | null;
}

export const DeleteContactDialog = ({
  open,
  onOpenChange,
  contactName,
  onConfirm,
  isDeleting = false,
  errorMessage,
}: DeleteContactDialogProps) => {
  const { t } = useLocale();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t("contacts_delete_contact_name", { name: contactName })}</DialogTitle>
          <DialogDescription>{t("contacts_delete_contact_description")}</DialogDescription>
        </DialogHeader>
        {errorMessage ? <p className="text-destructive text-xs">{errorMessage}</p> : null}
        <DialogFooter>
          <Button color="secondary" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            {t("cancel")}
          </Button>
          <Button color="destructive" onClick={onConfirm} loading={isDeleting} disabled={isDeleting}>
            <Trash2 className="h-3.5 w-3.5" /> {t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
