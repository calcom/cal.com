import { useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc, type RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { showToast } from "@calcom/ui/components/toast";

type Credentials = RouterOutputs["viewer"]["apps"]["appCredentialsByType"]["credentials"];

interface Props {
  credentials: Credentials;
  onSuccess?: () => void;
}

export function MultiDisconnectIntegration({ credentials, onSuccess }: Props) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [credentialToDelete, setCredentialToDelete] = useState<{
    id: number;
    teamId: number | null;
    name: string | null;
  } | null>(null);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);

  const mutation = trpc.viewer.credentials.delete.useMutation({
    onSuccess: () => {
      showToast(t("app_removed_successfully"), "success");
      onSuccess?.();
      setConfirmationDialogOpen(false);
    },
    onError: () => {
      showToast(t("error_removing_app"), "error");
      setConfirmationDialogOpen(false);
    },
    async onSettled() {
      await utils.viewer.calendars.connectedCalendars.invalidate();
      await utils.viewer.apps.integrations.invalidate();
    },
  });

  const getUserDisplayName = (user: (typeof credentials)[number]["user"]): string | null => {
    if (!user) return null;
    // Check if 'name' property exists and has a truthy string value
    if ("name" in user && typeof user.name === "string" && user.name) return user.name;
    // Otherwise use email if available and it's a string
    if ("email" in user && typeof user.email === "string" && user.email) return user.email;
    return null;
  };

  return (
    <>
      <Dropdown>
        <DropdownMenuTrigger asChild>
          <Button color="secondary">{t("disconnect")}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>
            <div className="w-48 text-left text-xs">{t("disconnect_app_from")}</div>
          </DropdownMenuLabel>
          {credentials.map((cred) => (
            <DropdownMenuItem key={cred.id}>
              <DropdownItem
                type="button"
                color="destructive"
                className="hover:bg-subtle hover:text-emphasis w-full border-0"
                StartIcon={cred.teamId ? "users" : "user"}
                onClick={() => {
                  setCredentialToDelete({
                    id: cred.id,
                    teamId: cred.teamId,
                    name: cred.team?.name || getUserDisplayName(cred.user) || null,
                  });
                  setConfirmationDialogOpen(true);
                }}>
                <div className="flex flex-col text-left">
                  <span>{cred.team?.name || getUserDisplayName(cred.user) || t("unnamed")}</span>
                </div>
              </DropdownItem>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </Dropdown>

      <Dialog open={confirmationDialogOpen} onOpenChange={setConfirmationDialogOpen}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("remove_app")}
          confirmBtnText={t("yes_remove_app")}
          onConfirm={() => {
            if (credentialToDelete) {
              mutation.mutate({
                id: credentialToDelete.id,
                ...(credentialToDelete.teamId ? { teamId: credentialToDelete.teamId } : {}),
              });
            }
          }}>
          <p className="mt-5">
            {t("are_you_sure_you_want_to_remove_this_app_from")} {credentialToDelete?.name || t("unnamed")}?
          </p>
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}
