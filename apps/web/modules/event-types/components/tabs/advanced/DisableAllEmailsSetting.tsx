import { Dialog } from "@calcom/features/components/controlled-dialog";
import type { InputClassNames, SettingsToggleClassNames } from "@calcom/features/eventtypes/lib/types";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { InputField, SettingsToggle } from "@calcom/ui/components/form";
import type { TFunction } from "i18next";
import { useState } from "react";

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
  const confirmationString = t("confirm", { defaultValue: "confirm" });

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
            <ServerTrans t={t} i18nKey="disable_attendees_emails_description" values={{ recipient }} />
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
              disabled={confirmText.toLowerCase() !== confirmationString.toLowerCase()}
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
