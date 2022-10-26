import { Controller, useForm } from "react-hook-form";

import LicenseRequired from "@calcom/ee/common/components/v2/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { trpc } from "@calcom/trpc/react";
import { DialogFooter } from "@calcom/ui/Dialog";
import { showToast } from "@calcom/ui/v2";
import Button from "@calcom/ui/v2/core/Button";
import { Form, TextArea } from "@calcom/ui/v2/core/form/fields";

interface TeamSSOValues {
  metadata: string;
}

export default function ConfigDialogForm({
  teamId,
  handleClose,
}: {
  teamId: number | null;
  handleClose: () => void;
}) {
  const { t } = useLocale();
  const utils = trpc.useContext();

  const telemetry = useTelemetry();

  const form = useForm<TeamSSOValues>();

  const mutation = trpc.useMutation("viewer.saml.update", {
    async onSuccess() {
      telemetry.event(telemetryEventTypes.samlConfig, collectPageParameters());
      await utils.invalidateQueries(["viewer.saml.get"]);
      showToast(t("saml_config_updated_successfully"), "success");
      handleClose();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  return (
    <LicenseRequired>
      <Form
        form={form}
        handleSubmit={(values) => {
          mutation.mutate({
            teamId,
            encodedRawMetadata: Buffer.from(values.metadata).toString("base64"),
          });
        }}>
        <div className="mb-10 mt-1">
          <h2 className="font-semi-bold font-cal text-xl tracking-wide text-gray-900">
            {t("saml_configuration")}
          </h2>
          <p className="mt-1 mb-5 text-sm text-gray-500">{t("saml_configuration_description")}</p>
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
          <Button type="button" color="secondary" onClick={handleClose} tabIndex={-1}>
            {t("cancel")}
          </Button>
          <Button type="submit" loading={form.formState.isSubmitting}>
            {t("save")}
          </Button>
        </DialogFooter>
      </Form>
    </LicenseRequired>
  );
}
