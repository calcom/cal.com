import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import type { SSOConnection } from "@calcom/ee/sso/lib/saml";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Form } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

type FormValues = {
  clientId: string;
  clientSecret: string;
  wellKnownUrl: string;
};

export default function OIDCConnection({
  teamId,
  connection,
}: {
  teamId: number | null;
  connection: SSOConnection | null;
}) {
  const { t } = useLocale();
  const [openModal, setOpenModal] = useState(false);

  return (
    <div>
      <div className="flex flex-col sm:flex-row">
        <div>
          <h2 className="font-medium">{t("sso_oidc_heading")}</h2>
          <p className="text-default text-sm font-normal leading-6 dark:text-gray-300">
            {t("sso_oidc_description")}
          </p>
        </div>
        {!connection && (
          <div className="shrink-0 pt-3 sm:ml-auto sm:pl-3 sm:pt-0">
            <Button data-testid="sso-oidc-configure" color="secondary" onClick={() => setOpenModal(true)}>
              {t("configure")}
            </Button>
          </div>
        )}
      </div>
      <CreateConnectionDialog teamId={teamId} openModal={openModal} setOpenModal={setOpenModal} />
    </div>
  );
}

const CreateConnectionDialog = ({
  teamId,
  openModal,
  setOpenModal,
}: {
  teamId: number | null;
  openModal: boolean;
  setOpenModal: (open: boolean) => void;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const form = useForm<FormValues>();

  const mutation = trpc.viewer.saml.updateOIDC.useMutation({
    async onSuccess() {
      showToast(
        t("sso_connection_created_successfully", {
          connectionType: "OIDC",
        }),
        "success"
      );
      setOpenModal(false);
      await utils.viewer.saml.get.invalidate();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  return (
    <Dialog open={openModal} onOpenChange={setOpenModal}>
      <DialogContent type="creation">
        <Form
          form={form}
          handleSubmit={(values) => {
            const { clientId, clientSecret, wellKnownUrl } = values;

            mutation.mutate({
              teamId,
              clientId,
              clientSecret,
              wellKnownUrl,
            });
          }}>
          <h2 className="font-semi-bold font-cal text-emphasis text-xl tracking-wide">
            {t("sso_oidc_configuration_title")}
          </h2>
          <p className="text-subtle mb-4 mt-1 text-sm">{t("sso_oidc_configuration_description")}</p>
          <div className="stack-y-5">
            <Controller
              control={form.control}
              name="clientId"
              render={({ field: { value } }) => (
                <TextField
                  name="clientId"
                  label="Client id"
                  data-testid="sso-oidc-client-id"
                  value={value}
                  onChange={(e) => {
                    form.setValue("clientId", e?.target.value);
                  }}
                  type="text"
                  required
                />
              )}
            />
            <Controller
              control={form.control}
              name="clientSecret"
              render={({ field: { value } }) => (
                <TextField
                  name="clientSecret"
                  label="Client secret"
                  data-testid="sso-oidc-client-secret"
                  value={value}
                  onChange={(e) => {
                    form.setValue("clientSecret", e?.target.value);
                  }}
                  type="text"
                  required
                />
              )}
            />
            <Controller
              control={form.control}
              name="wellKnownUrl"
              render={({ field: { value } }) => (
                <TextField
                  name="wellKnownUrl"
                  label="Well-Known URL"
                  data-testid="sso-oidc-well-known-url"
                  value={value}
                  onChange={(e) => {
                    form.setValue("wellKnownUrl", e?.target.value);
                  }}
                  type="text"
                  required
                />
              )}
            />
          </div>
          <DialogFooter showDivider className="relative mt-10">
            <Button
              type="button"
              color="secondary"
              onClick={() => {
                setOpenModal(false);
              }}
              tabIndex={-1}>
              {t("cancel")}
            </Button>
            <Button type="submit" data-testid="sso-oidc-save" loading={form.formState.isSubmitting}>
              {t("save")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
