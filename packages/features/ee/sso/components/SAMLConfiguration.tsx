import { useRouter } from "next/router";
import { useState } from "react";

import LicenseRequired from "@calcom/features/ee/common/components/v2/LicenseRequired";
import ConfigDialogForm from "@calcom/features/ee/sso/components/ConfigDialogForm";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Button, showToast } from "@calcom/ui/v2";
import Badge from "@calcom/ui/v2/core/Badge";
import ConfirmationDialogContent from "@calcom/ui/v2/core/ConfirmationDialogContent";
import { Dialog, DialogTrigger, DialogContent } from "@calcom/ui/v2/core/Dialog";
import Meta from "@calcom/ui/v2/core/Meta";

export default function SAMLConfiguration({
  teamsView,
  teamId,
}: {
  teamsView: boolean;
  teamId: number | null;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();

  const [configModal, setConfigModal] = useState(false);

  const { data: connection } = trpc.useQuery(["viewer.saml.get", { teamsView, teamId }], {
    onError: () => {
      router.push("/settings");
    },
  });

  const mutation = trpc.useMutation("viewer.saml.delete", {
    async onSuccess() {
      await utils.invalidateQueries(["viewer.saml.get"]);
      showToast(t("saml_config_deleted_successfully"), "success");
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const deleteConnection = () => {
    mutation.mutate({
      teamId: Number(router.query.id),
    });
  };

  const isAdmin = true;

  if (!connection) {
    return <></>;
  }

  if (!connection.samlEnabled) {
    return <Meta title="SAML SSO" description="Allow team members to login using an Identity Provider." />;
  }

  return (
    <LicenseRequired>
      <Meta title="SAML SSO" description="Allow team members to login using an Identity Provider." />
      {isAdmin ? (
        <>
          <div className="flex flex-col justify-between md:flex-row">
            <div className="mb-3">
              {connection && connection.provider ? (
                <Badge variant="green" bold>
                  SAML SSO Enabled via {connection.provider}
                </Badge>
              ) : (
                <Badge variant="gray" bold>
                  Not Enabled
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
                Configure
              </Button>
            </div>
          </div>

          {/* Danger Zone and Delete Confirmation */}
          {connection.provider && (
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
                  {t("delete_saml_configuration_confirmation_message")}
                </ConfirmationDialogContent>
              </Dialog>
            </>
          )}

          {/* Add/Update SAML Connection */}
          <Dialog open={configModal} onOpenChange={setConfigModal}>
            <DialogContent type="creation" useOwnActionButtons>
              <ConfigDialogForm handleClose={() => setConfigModal(false)} teamId={teamId} />
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <div className="rounded-md border border-gray-200 p-5">
          <span className="text-sm text-gray-600">{t("only_owner_change")}</span>
        </div>
      )}
    </LicenseRequired>
  );
}
