import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { DisconnectIntegrationComponent } from "@calcom/ui";
import type { ButtonProps } from "@calcom/ui";

import { useDeleteCalendarCredentials } from "../../../hooks/calendars/useDeleteCalendarCredentials";
import { useToast } from "./use-toast";

export const PlatformDisconnectIntegration = (props: {
  credentialId: number;
  label?: string;
  slug?: string;
  trashIcon?: boolean;
  isGlobal?: boolean;
  onSuccess?: () => void;
  buttonProps?: ButtonProps;
}) => {
  const { t } = useLocale();
  const { onSuccess, credentialId, slug } = props;
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();
  const { mutate: deleteCalendarCredentials } = useDeleteCalendarCredentials({
    onSuccess: () => {
      toast({
        description: t("app_removed_successfully"),
      });
      setModalOpen(false);
      onSuccess && onSuccess();
    },
    onError: () => {
      toast({
        description: t("error_removing_app"),
      });
      setModalOpen(false);
    },
  });

  return (
    <DisconnectIntegrationComponent
      onDeletionConfirmation={async () => {
        slug &&
          (await deleteCalendarCredentials({
            calendar: slug.split("-")[0],
            id: credentialId,
          }));
      }}
      {...props}
      isModalOpen={modalOpen}
      onModalOpen={() => setModalOpen((prevValue) => !prevValue)}
    />
  );
};
