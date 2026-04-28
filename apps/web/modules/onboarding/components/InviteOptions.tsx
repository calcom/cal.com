"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { LinkIcon, MailIcon, UploadIcon } from "@coss/ui/icons";

type InviteOptionsProps = {
  onInviteViaEmail: () => void;
  onUploadCSV?: () => void;
  onCopyInviteLink?: () => void;
  isSubmitting?: boolean;
};

export const InviteOptions = ({
  onInviteViaEmail,
  onUploadCSV,
  onCopyInviteLink,
  isSubmitting = false,
}: InviteOptionsProps) => {
  const { t } = useLocale();

  return (
    <div className="flex h-full w-full flex-1 flex-col gap-6 ">
      <div className="flex w-full flex-1 flex-col gap-4">
        <Button
          color="primary"
          className="h-8 w-full justify-center rounded-[10px]"
          onClick={onInviteViaEmail}
          disabled={isSubmitting}>
          <div className="flex items-center gap-1">
            <MailIcon className="h-4 w-4" />
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
              <UploadIcon className="h-4 w-4" />
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
              <LinkIcon className="h-4 w-4" />
              <span>{t("copy_invite_link")}</span>
            </div>
          </Button>
        )}
      </div>
    </div>
  );
};
