"use client";

import { useFlags } from "@calcom/features/flags/hooks";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

type InviteOptionsProps = {
  onInviteViaEmail: () => void;
  onUploadCSV?: () => void;
  onCopyInviteLink?: () => void;
  onConnectGoogleWorkspace?: () => void;
  isSubmitting?: boolean;
};

export const InviteOptions = ({
  onInviteViaEmail,
  onUploadCSV,
  onCopyInviteLink,
  onConnectGoogleWorkspace,
  isSubmitting = false,
}: InviteOptionsProps) => {
  const { t } = useLocale();
  const flags = useFlags();
  const googleWorkspaceEnabled = flags["google-workspace-directory"];

  return (
    <div className="flex w-full flex-1 flex-col gap-6 px-5">
      {googleWorkspaceEnabled && onConnectGoogleWorkspace && (
        <>
          <Button
            color="secondary"
            className="h-8 w-full rounded-[10px]"
            StartIcon="google"
            onClick={onConnectGoogleWorkspace}
            disabled={isSubmitting}>
            {t("connect_google_workspace")}
          </Button>

          <div className="flex w-full items-center gap-2">
            <div className="border-subtle h-px flex-1 border-t" />
            <span className="text-subtle text-sm font-medium">{t("or")}</span>
            <div className="border-subtle h-px flex-1 border-t" />
          </div>
        </>
      )}

      <div className="flex w-full flex-col gap-4">
        <Button
          color="primary"
          className="h-8 w-full justify-center rounded-[10px]"
          onClick={onInviteViaEmail}
          disabled={isSubmitting}>
          <div className="flex items-center gap-1">
            <Icon name="mail" className="h-4 w-4" />
            <span>{t("invite_via_email")}</span>
          </div>
        </Button>

        {onUploadCSV && (
          <Button
            color="secondary"
            className="h-8 w-full justify-center rounded-[10px]"
            onClick={onUploadCSV}
            disabled={isSubmitting}>
            <div className="flex items-center gap-1">
              <Icon name="upload" className="h-4 w-4" />
              <span>{t("upload_csv_file")}</span>
            </div>
          </Button>
        )}

        {onCopyInviteLink && (
          <Button
            color="secondary"
            className="h-8 w-full justify-center rounded-[10px]"
            onClick={onCopyInviteLink}
            disabled>
            <div className="flex items-center gap-1">
              <Icon name="link" className="h-4 w-4" />
              <span>{t("copy_invite_link")}</span>
            </div>
          </Button>
        )}
      </div>
    </div>
  );
};
