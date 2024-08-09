import type { TFunction } from "next-i18next";
import { Trans } from "next-i18next";
import { useState } from "react";

import {
  SettingsToggle,
  Dialog,
  DialogContent,
  DialogFooter,
  InputField,
  DialogClose,
  Button,
} from "@calcom/ui";

interface DisableEmailsSettingProps {
  checked: boolean;
  onCheckedChange: (e: boolean) => void;
  recipient: "attendees" | "hosts";
  t: TFunction;
}

export const DisableAllEmailsSetting = ({
  checked,
  onCheckedChange,
  recipient,
  t,
}: DisableEmailsSettingProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const title =
    recipient === "attendees" ? t("disable_all_emails_to_attendees") : t("disable_all_emails_to_hosts");

  return (
    <div>
      <Dialog open={dialogOpen} onOpenChange={(e) => setDialogOpen(e)}>
        <DialogContent title={title} Icon="circle-alert">
          <p className="text-default text-sm">
            <Trans i18nKey="disable_attendees_emails_description">
              This will disable all emails to {{ recipient }}. This includes booking confirmations, requests,
              reschedules and reschedule requests, cancellation emails, and any other emails related to
              booking updates.
              <br />
              <br />
              It is your responsibility to ensure that your {{ recipient }} are aware of any bookings and
              changes to their bookings.
            </Trans>
          </p>
          <p className="text-default mb-1 mt-2 text-sm">{t("type_confirm_to_continue")}</p>
          <InputField
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
            }}
          />
          <DialogFooter>
            <DialogClose />
            <Button
              disabled={confirmText !== "confirm"}
              onClick={(e) => {
                onCheckedChange(true);
                setDialogOpen(false);
              }}>
              {t("disable_email")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SettingsToggle
        labelClassName="text-sm"
        toggleSwitchAtTheEnd={true}
        switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
        title={title}
        description={t("disable_all_emails_description")}
        checked={!!checked}
        onCheckedChange={() => {
          checked ? onCheckedChange(!checked) : setDialogOpen(true);
        }}
      />
    </div>
  );
};
