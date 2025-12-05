import { Button } from "@calid/features/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/types/server/routers/_app";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";

import type { inferRouterOutputs } from "@trpc/server";

type RouterOutput = inferRouterOutputs<AppRouter>;
type Credentials = RouterOutput["viewer"]["apps"]["calid_appCredentialsByType"]["credentials"];

interface Props {
  categories: string[];
  credentials: Credentials;
  onSuccess?: () => void;
}

export function MultiDisconnectIntegration({ categories, credentials, onSuccess }: Props) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [credentialToDelete, setCredentialToDelete] = useState<{
    id: number;
    teamId: number | null;
    name: string | null;
  } | null>(null);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);

  const mutation = trpc.viewer.credentials.calid_delete.useMutation({
    onSuccess: () => {
      triggerToast(t("app_removed_successfully"), "success");
      onSuccess && onSuccess();
      setConfirmationDialogOpen(false);
    },
    onError: () => {
      triggerToast(t("error_removing_app"), "error");
      setConfirmationDialogOpen(false);
    },
    async onSettled() {
      await utils.viewer.calendars.connectedCalendars.invalidate();
      await utils.viewer.apps.calid_integrations.invalidate();
    },
  });

  const { data: connectedCalendarData, isPending: isConnectedCalendarQueryPending } =
    categories.indexOf("calendar") !== -1
      ? trpc.viewer.calendars.connectedCalendars.useQuery(undefined, {
          enabled: true,
        })
      : {};

  const getUserDisplayName = (user: (typeof credentials)[number]["user"]) => {
    if (!user) return null;
    // Check if 'name' property exists on user
    if ("name" in user) return user.name;
    // Otherwise use email if available
    if ("email" in user) return user.email;
    return null;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button color="secondary">{t("disconnect")}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>
            <div className="w-48 text-left text-xs">{t("disconnect_app_from")}</div>
          </DropdownMenuLabel>
          {credentials.map((cred) => (
            <DropdownMenuItem key={cred.id}>
              <DropdownMenuItem
                type="button"
                color="destructive"
                className="hover:bg-subtle hover:text-emphasis w-full border-0"
                StartIcon={cred.calIdTeamId ? "users" : "user"}
                onClick={() => {
                  setCredentialToDelete({
                    id: cred.id,
                    teamId: cred.calIdTeamId,
                    name: cred.calIdTeamId?.name || getUserDisplayName(cred.user) || null,
                  });
                  setConfirmationDialogOpen(true);
                }}>
                <div className="flex flex-col text-left">
                  <span>{cred.calIdTeam?.name || cred.user.name || t("unnamed")}</span>
                  {categories.indexOf("calendar") !== -1 && !isConnectedCalendarQueryPending && (
                    <span>
                      {connectedCalendarData?.connectedCalendars?.find((e) => e.credentialId === cred.id)
                        ?.primary.email || t("unnamed")}
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

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
