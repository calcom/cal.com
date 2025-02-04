import type { TFunction } from "next-i18next";
import { Trans } from "next-i18next";
import { useState } from "react";

import type { InputClassNames, SettingsToggleClassNames } from "@calcom/features/eventtypes/lib/types";
import { classNames } from "@calcom/lib";
import {
  SettingsToggle,
  Dialog,
  DialogContent,
  DialogFooter,
  InputField,
  DialogClose,
  Button,
} from "@calcom/ui";

export type EmailNotificationToggleCustomClassNames = SettingsToggleClassNames & {
  confirmationDialog?: {
    container?: string;
    dialogTitle?: string;
    description?: string;
    confirmInput?: InputClassNames;
    dialogFooter?: {
      container?: string;
      confirmButton?: string;
      cancelButton?: string;
    };
  };
};

interface DisableEmailsSettingProps {
  checked: boolean;
  onCheckedChange: (e: boolean) => void;
  recipient: "attendees" | "hosts";
  t: TFunction;
  customClassNames?: EmailNotificationToggleCustomClassNames;
}

export const DisableAllEmailsSetting = ({
  checked,
  onCheckedChange,
  recipient,
  t,
  customClassNames,
}: DisableEmailsSettingProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const title =
    recipient === "attendees" ? t("disable_all_emails_to_attendees") : t("disable_all_emails_to_hosts");

  return (
    <div>
      <Dialog open={dialogOpen} onOpenChange={(e) => setDialogOpen(e)}>
        <DialogContent
          title={title}
          Icon="circle-alert"
          className={customClassNames?.confirmationDialog?.container}>
          <p
            className={classNames("text-default text-sm", customClassNames?.confirmationDialog?.description)}>
            <Trans i18nKey="disable_attendees_emails_description">
              This will disable all emails to {recipient}. This includes booking confirmations, requests,
              reschedules and reschedule requests, cancellation emails, and any other emails related to
              booking updates.
              <br />
              <br />
              It is your responsibility to ensure that your {recipient} are aware of any bookings and changes
              to their bookings.
            </Trans>
          </p>
          <p
            className={classNames(
              "text-default mb-1 mt-2 text-sm",
              customClassNames?.confirmationDialog?.confirmInput?.label
            )}>
            {t("type_confirm_to_continue")}
          </p>
          <InputField
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
            }}
          />
          <DialogFooter className={customClassNames?.confirmationDialog?.dialogFooter?.container}>
            <DialogClose className={customClassNames?.confirmationDialog?.dialogFooter?.cancelButton} />
            <Button
              disabled={confirmText !== "confirm"}
              onClick={() => {
                onCheckedChange(true);
                setDialogOpen(false);
              }}
              className={customClassNames?.confirmationDialog?.dialogFooter?.confirmButton}>
              {t("disable_email")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SettingsToggle
        labelClassName={classNames("text-sm", customClassNames?.label)}
        toggleSwitchAtTheEnd={true}
        switchContainerClassName={classNames(
          "border-subtle rounded-lg border py-6 px-4 sm:px-6",
          customClassNames?.container
        )}
        descriptionClassName={customClassNames?.description}
        title={title}
        description={t("disable_all_emails_description")}
        checked={!!checked}
        onCheckedChange={() => (checked ? onCheckedChange(!checked) : setDialogOpen(true))}
      />
    </div>
  );
};
