import { useState } from "react";

import LicenseRequired from "@calcom/features/ee/common/components/v2/LicenseRequired";
import ConfigDialogForm from "@calcom/features/ee/sso/components/ConfigDialogForm";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Alert,
  Badge,
  Button,
  ClipboardCopyIcon,
  ConfirmationDialogContent,
  Dialog,
  DialogContent,
  DialogTrigger,
  Icon,
  Label,
  Meta,
  showToast,
  AppSkeletonLoader as SkeletonLoader,
} from "@calcom/ui";

export default function SAMLConfiguration({ teamId }: { teamId: number | null }) {
  const { t } = useLocale();
  const utils = trpc.useContext();

  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [configModal, setConfigModal] = useState(false);

  const { data: connection, isLoading } = trpc.viewer.saml.get.useQuery(
    { teamId },
    {
      onError: (err) => {
        setHasError(true);
        setErrorMessage(err.message);
      },
      onSuccess: () => {
        setHasError(false);
        setErrorMessage("");
      },
    }
  );

  const mutation = trpc.viewer.saml.delete.useMutation({
    async onSuccess() {
      await utils.viewer.saml.get.invalidate();
      showToast(t("saml_config_deleted_successfully"), "success");
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const deleteConnection = () => {
    mutation.mutate({
      teamId,
    });
  };

  if (isLoading) {
    return <SkeletonLoader title={t("saml_config")} description={t("saml_description")} />;
  }

  if (hasError) {
    return (
      <>
        <Meta title={t("saml_config")} description={t("saml_description")} />
        <Alert severity="warning" message={t(errorMessage)} className="mb-4 " />
      </>
    );
  }

  return (
    <>
      <Meta title={t("saml_config")} description={t("saml_description")} />
      <LicenseRequired>
        <div className="flex flex-col justify-between md:flex-row">
          <div className="mb-3">
            {connection && connection.provider ? (
              <Badge variant="green" bold>
                SAML SSO enabled via {connection.provider}
              </Badge>
            ) : (
              <Badge variant="gray" bold>
                {t("saml_not_configured_yet")}
              </Badge>
            )}
          </div>
          <div>
            <Button
              color="secondary"
              StartIcon={Icon.FiDatabase}
              onClick={() => {
                setConfigModal(true);
              }}>
              {t("saml_btn_configure")}
            </Button>
          </div>
        </div>

        {/* Service Provider Details */}
        {connection && connection.provider && (
          <>
            <hr className="border-1 my-8 border-gray-200" />
            <div className="mb-3 text-base font-semibold">{t("saml_sp_title")}</div>
            <p className="mt-3 text-sm font-normal leading-6 text-gray-700 dark:text-gray-300">
              {t("saml_sp_description")}
            </p>
            <div className="mt-5 flex flex-col">
              <div className="flex">
                <Label>{t("saml_sp_acs_url")}</Label>
              </div>
              <div className="flex">
                <code className="mr-1 w-full truncate rounded-sm bg-gray-100 py-2 px-3 font-mono text-gray-800">
                  {connection.acsUrl}
                </code>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(connection.acsUrl);
                    showToast(t("saml_sp_acs_url_copied"), "success");
                  }}
                  type="button"
                  className="px-4 text-base">
                  <ClipboardCopyIcon className="h-5 w-5 text-neutral-100" />
                  {t("copy")}
                </Button>
              </div>
            </div>
            <div className="mt-5 flex flex-col">
              <div className="flex">
                <Label>{t("saml_sp_entity_id")}</Label>
              </div>
              <div className="flex">
                <code className="mr-1 w-full truncate rounded-sm bg-gray-100 py-2 px-3 font-mono text-gray-800">
                  {connection.entityId}
                </code>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(connection.entityId);
                    showToast(t("saml_sp_entity_id_copied"), "success");
                  }}
                  type="button"
                  className="px-4 text-base">
                  <ClipboardCopyIcon className="h-5 w-5 text-neutral-100" />
                  {t("copy")}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Danger Zone and Delete Confirmation */}
        {connection && connection.provider && (
          <>
            <hr className="border-1 my-8 border-gray-200" />
            <div className="mb-3 text-base font-semibold">{t("danger_zone")}</div>
            <Dialog>
              <DialogTrigger asChild>
                <Button color="destructive" className="border" StartIcon={Icon.FiTrash2}>
                  {t("delete_saml_configuration")}
                </Button>
              </DialogTrigger>
              <ConfirmationDialogContent
                variety="danger"
                title={t("delete_saml_configuration")}
                confirmBtnText={t("confirm_delete_saml_configuration")}
                onConfirm={deleteConnection}>
                {t("delete_saml_configuration_confirmation_message", { appName: APP_NAME })}
              </ConfirmationDialogContent>
            </Dialog>
          </>
        )}

        {/* Add/Update SAML Connection */}
        <Dialog open={configModal} onOpenChange={setConfigModal}>
          <DialogContent type="creation">
            <ConfigDialogForm handleClose={() => setConfigModal(false)} teamId={teamId} />
          </DialogContent>
        </Dialog>
      </LicenseRequired>
    </>
  );
}
