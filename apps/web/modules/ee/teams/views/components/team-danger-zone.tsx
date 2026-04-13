"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  AlertDialog,
  AlertDialogPopup,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from "@coss/ui/components/alert-dialog";
import { Button } from "@coss/ui/components/button";
import { Card, CardFrame, CardFrameFooter, CardPanel } from "@coss/ui/components/card";
import { Label } from "@coss/ui/components/label";
import { LogOutIcon, Trash2Icon } from "@coss/ui/icons";
import { useState } from "react";

export type TeamDangerZoneProps = {
  isOwner: boolean;
  onDisbandTeam: () => void;
  onLeaveTeam: () => void;
  isDisbanding?: boolean;
  isLeaving?: boolean;
};

export function TeamDangerZone({
  isOwner,
  onDisbandTeam,
  onLeaveTeam,
  isDisbanding,
  isLeaving,
}: TeamDangerZoneProps) {
  const { t } = useLocale();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <CardFrame>
        <Card>
          <CardPanel>
            <div className="flex flex-col gap-1">
              <Label className="text-base font-semibold">{t("danger_zone")}</Label>
              {isOwner && (
                <p className="text-muted-foreground text-sm">{t("team_deletion_cannot_be_undone")}</p>
              )}
            </div>
          </CardPanel>
        </Card>
        <CardFrameFooter className="flex justify-end">
          {isOwner ? (
            <Button
              variant="destructive-outline"
              onClick={() => setConfirmOpen(true)}
              data-testid="disband-team-button">
              <Trash2Icon aria-hidden="true" />
              {t("disband_team")}
            </Button>
          ) : (
            <Button variant="destructive-outline" onClick={() => setConfirmOpen(true)}>
              <LogOutIcon aria-hidden="true" />
              {t("leave_team")}
            </Button>
          )}
        </CardFrameFooter>
      </CardFrame>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{isOwner ? t("disband_team") : t("leave_team")}</AlertDialogTitle>
            <AlertDialogDescription>
              {isOwner ? t("disband_team_confirmation_message") : t("leave_team_confirmation_message")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>{t("cancel")}</AlertDialogClose>
            <Button
              variant="destructive"
              loading={isOwner ? isDisbanding : isLeaving}
              data-testid="dialog-confirmation"
              onClick={() => {
                if (isOwner) {
                  onDisbandTeam();
                } else {
                  onLeaveTeam();
                }
              }}>
              {isOwner ? t("confirm_disband_team") : t("confirm_leave_team")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}
