"use client";

import { useFlags } from "@calcom/features/flags/hooks";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_4178_176214)">
      <path
        d="M8.31875 15.36C4.26 15.36 0.9575 12.0588 0.9575 8.00001C0.9575 3.94126 4.26 0.640015 8.31875 0.640015C10.1575 0.640015 11.9175 1.32126 13.2763 2.55876L13.5238 2.78501L11.0963 5.21251L10.8713 5.02001C10.1588 4.41001 9.2525 4.07376 8.31875 4.07376C6.15375 4.07376 4.39125 5.83501 4.39125 8.00001C4.39125 10.165 6.15375 11.9263 8.31875 11.9263C9.88 11.9263 11.1138 11.1288 11.695 9.77001H7.99875V6.45626L15.215 6.46626L15.2688 6.72001C15.645 8.50626 15.3438 11.1338 13.8188 13.0138C12.5563 14.57 10.7063 15.36 8.31875 15.36Z"
        fill="#6B7280"
      />
    </g>
    <defs>
      <clipPath id="clip0_4178_176214">
        <rect width="16" height="16" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

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
    <div className="flex h-full w-full flex-1 flex-col gap-6 ">
      {googleWorkspaceEnabled && onConnectGoogleWorkspace && (
        <>
          <Button
            color="secondary"
            className="h-8 w-full rounded-[10px]"
            CustomStartIcon={<GoogleIcon />}
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

      <div className="flex w-full flex-1 flex-col gap-4">
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
