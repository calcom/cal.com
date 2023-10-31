import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { ReactNode } from "react";

export function EventTypeDialog({
  open,
  onOpenChange,
  title,
  description,
  content,
}: {
  open: boolean;
  onOpenChange: () => void;
  title: string;
  description: string;
  content?: ReactNode;
}) {
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {!!content && content}
        </DialogContent>
      </Dialog>
    </>
  );
}
