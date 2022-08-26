import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Button } from "@calcom/ui/v2/core/Button";
import { Dialog, DialogTrigger, DialogContent } from "@calcom/ui/v2/core/Dialog";
import showToast from "@calcom/ui/v2/core/notfications";

export default function DisconnectIntegration({
  credentialId,
  label,
  trashIcon,
  isGlobal,
}: {
  credentialId: number;
  label: string;
  trashIcon?: boolean;
  isGlobal?: boolean;
}) {
  const { t } = useLocale();
  const [modalOpen, setModalOpen] = useState(false);

  const mutation = trpc.useMutation("viewer.deleteCredential", {
    onSuccess: () => {
      showToast("Integration deleted successfully", "success");
      setModalOpen(false);
    },
    onError: () => {
      showToast("Error deleting app", "error");
      setModalOpen(false);
    },
  });

  return (
    <>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogTrigger asChild>
          <Button color="destructive" StartIcon={trashIcon ? Icon.FiTrash : undefined} disabled={isGlobal}>
            {label}
          </Button>
        </DialogTrigger>
        <DialogContent
          title="Remove app"
          description="Are you sure you want to remove this app?"
          type="confirmation"
          actionText="Yes, remove app"
          Icon={Icon.FiAlertCircle}
          actionOnClick={() => mutation.mutate({ id: credentialId })}
        />
      </Dialog>
    </>
  );
}
