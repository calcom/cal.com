import { Dialog, DialogContent } from "@calcom/ui";

import { BookEventForm } from "./BookEventForm";

export function BookFormAsModal({ visible, onCancel }: { visible: boolean; onCancel: () => void }) {
  return (
    <Dialog open={visible}>
      <DialogContent type={undefined}>
        <BookEventForm onCancel={onCancel} />
      </DialogContent>
    </Dialog>
  );
}
