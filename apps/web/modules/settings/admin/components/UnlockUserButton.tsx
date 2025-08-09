import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";

interface UnlockUserButtonProps {
  userId: number;
  email: string;
  onSuccess?: () => void;
}

export function UnlockUserButton({ userId, email, onSuccess }: UnlockUserButtonProps) {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const unlockUserMutation = trpc.viewer.admin.unlockUserAccount.useMutation({
    onSuccess: () => {
      showToast(t("user_unlocked_successfully"), "success");
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const handleUnlock = async () => {
    setIsLoading(true);
    try {
      await unlockUserMutation.mutateAsync({
        userId,
        email,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="button" color="secondary">
          {t("unlock_user")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title={t("unlock_user_account")}>
        </DialogHeader>
        <div className="space-y-4">
          <p>{t("unlock_user_confirmation", { email })}</p>
          <div className="flex justify-end space-x-2">
            <Button variant="button" onClick={() => setIsOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="button"
              onClick={handleUnlock}
              disabled={isLoading}
              loading={isLoading}>
              {t("unlock")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 