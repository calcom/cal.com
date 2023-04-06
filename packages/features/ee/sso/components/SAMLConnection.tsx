import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import type { SSOConnection } from "@calcom/ee/sso/lib/saml";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, DialogFooter, Form, showToast, TextArea, Dialog, DialogContent } from "@calcom/ui";

interface FormValues {
  metadata: string;
}

export default function SAMLConnection({
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
          <h2 className="font-medium">{t("sso_saml_heading")}</h2>
          <p className="text-default text-sm font-normal leading-6 dark:text-gray-300">
            {t("sso_saml_description")}
          </p>
        </div>
        {!connection && (
          <div className="flex-shrink-0 pt-3 sm:ml-auto sm:pt-0 sm:pl-3">
            <Button color="secondary" onClick={() => setOpenModal(true)}>
              Configure
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

  const mutation = trpc.viewer.saml.update.useMutation({
    async onSuccess() {
      showToast(
        t("sso_connection_created_successfully", {
          connectionType: "SAML",
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
            mutation.mutate({
              teamId,
              encodedRawMetadata: Buffer.from(values.metadata).toString("base64"),
            });
          }}>
          <div className="mb-10 mt-1">
            <h2 className="font-semi-bold font-cal text-emphasis text-xl tracking-wide">
              {t("sso_saml_configuration_title")}
            </h2>
            <p className="text-subtle mt-1 mb-5 text-sm">{t("sso_saml_configuration_description")}</p>
          </div>
          <Controller
            control={form.control}
            name="metadata"
            render={({ field: { value } }) => (
              <div>
                <TextArea
                  data-testid="saml_config"
                  name="metadata"
                  value={value}
                  className="h-40"
                  required={true}
                  placeholder={t("saml_configuration_placeholder")}
                  onChange={(e) => {
                    form.setValue("metadata", e?.target.value);
                  }}
                />
              </div>
            )}
          />
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
