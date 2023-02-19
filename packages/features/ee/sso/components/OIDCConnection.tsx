import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import type { SSOConnection } from "@calcom/ee/sso/lib/saml";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, DialogFooter, Form, showToast, TextField, Dialog, DialogContent } from "@calcom/ui";

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
          <p className="text-sm font-normal leading-6 text-gray-700 dark:text-gray-300">
            {t("sso_oidc_description")}
          </p>
        </div>
        {!connection && (
          <div className="flex-shrink-0 pt-3 sm:ml-auto sm:pt-0 sm:pl-3">
            <Button color="secondary" onClick={() => setOpenModal(true)}>
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
  const utils = trpc.useContext();
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
          <div className="mb-10 mt-1">
            <h2 className="font-semi-bold font-cal text-xl tracking-wide text-gray-900">
              {t("sso_oidc_configuration_title")}
            </h2>
            <p className="mt-1 mb-5 text-sm text-gray-500">{t("sso_oidc_configuration_description")}</p>
          </div>
          <div className="space-y-5">
            <Controller
              control={form.control}
              name="clientId"
              render={({ field: { value } }) => (
                <TextField
                  name="clientId"
                  label="Client id"
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
          <DialogFooter>
            <Button
              type="button"
              color="secondary"
              onClick={() => {
                setOpenModal(false);
              }}
              tabIndex={-1}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {t("save")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
