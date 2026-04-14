"use client";

import type { SSOConnection } from "@calcom/ee/sso/lib/saml";
import { useLocale } from "@calcom/i18n/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@coss/ui/components/dialog";
import { Field, FieldError, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import { toastManager } from "@coss/ui/components/toast";
import {
  ListItem,
  ListItemActions,
  ListItemContent,
  ListItemDescription,
  ListItemHeader,
  ListItemTitle,
} from "@coss/ui/shared/list-item";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

type FormValues = {
  clientId: string;
  clientSecret: string;
  wellKnownUrl: string;
};

function OIDCFormFields({ form }: { form: ReturnType<typeof useForm<FormValues>> }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-4">
      <Controller
        control={form.control}
        name="clientId"
        rules={{ required: t("field_required") }}
        render={({ field: { ref, name, value, onBlur, onChange }, fieldState: { invalid, error } }) => (
          <Field name={name} invalid={invalid}>
            <FieldLabel>{t("client_id")}</FieldLabel>
            <Input
              ref={ref}
              name={name}
              data-testid="sso-oidc-client-id"
              type="text"
              value={value ?? ""}
              onBlur={onBlur}
              onValueChange={onChange}
            />
            <FieldError match={!!error}>{error?.message}</FieldError>
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="clientSecret"
        rules={{ required: t("field_required") }}
        render={({ field: { ref, name, value, onBlur, onChange }, fieldState: { invalid, error } }) => (
          <Field name={name} invalid={invalid}>
            <FieldLabel>{t("client_secret")}</FieldLabel>
            <Input
              ref={ref}
              name={name}
              data-testid="sso-oidc-client-secret"
              type="text"
              value={value ?? ""}
              onBlur={onBlur}
              onValueChange={onChange}
            />
            <FieldError match={!!error}>{error?.message}</FieldError>
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name="wellKnownUrl"
        rules={{ required: t("field_required") }}
        render={({ field: { ref, name, value, onBlur, onChange }, fieldState: { invalid, error } }) => (
          <Field name={name} invalid={invalid}>
            <FieldLabel>{t("sso_oidc_well_known_url")}</FieldLabel>
            <Input
              ref={ref}
              name={name}
              data-testid="sso-oidc-well-known-url"
              type="text"
              value={value ?? ""}
              onBlur={onBlur}
              onValueChange={onChange}
            />
            <FieldError match={!!error}>{error?.message}</FieldError>
          </Field>
        )}
      />
    </div>
  );
}

export default function OIDCConnection({
  teamId,
  connection,
}: {
  teamId: number | null;
  connection: SSOConnection | null;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const form = useForm<FormValues>();

  const mutation = trpc.viewer.saml.updateOIDC.useMutation({
    async onSuccess() {
      toastManager.add({
        title: t("sso_connection_created_successfully", { connectionType: "OIDC" }),
        type: "success",
      });
      setOpen(false);
      await utils.viewer.saml.get.invalidate();
    },
    onError: (err) => {
      toastManager.add({ title: err.message, type: "error" });
    },
  });

  return (
    <ListItem className="max-[400px]:*:flex-col max-[400px]:*:items-start">
      <ListItemContent>
        <ListItemHeader>
          <ListItemTitle>{t("sso_oidc_heading")}</ListItemTitle>
          <ListItemDescription>{t("sso_oidc_description")}</ListItemDescription>
        </ListItemHeader>
      </ListItemContent>
      {!connection && (
        <ListItemActions>
          <Dialog
            open={open}
            onOpenChange={setOpen}
            onOpenChangeComplete={(open) => {
              if (!open) form.reset();
            }}>
            <DialogTrigger
              render={
                <Button variant="outline" data-testid="sso-oidc-configure">
                  {t("configure")}
                </Button>
              }
            />
            <DialogPopup>
              <Form
                className="contents"
                onSubmit={form.handleSubmit((values) => {
                  mutation.mutate({
                    teamId,
                    clientId: values.clientId,
                    clientSecret: values.clientSecret,
                    wellKnownUrl: values.wellKnownUrl,
                  });
                })}>
                <DialogHeader>
                  <DialogTitle>{t("sso_oidc_configuration_title")}</DialogTitle>
                  <DialogDescription>{t("sso_oidc_configuration_description")}</DialogDescription>
                </DialogHeader>
                <DialogPanel>
                  <OIDCFormFields form={form} />
                </DialogPanel>
                <DialogFooter>
                  <DialogClose render={<Button variant="ghost">{t("cancel")}</Button>} />
                  <Button type="submit" data-testid="sso-oidc-save" disabled={form.formState.isSubmitting}>
                    {t("save")}
                  </Button>
                </DialogFooter>
              </Form>
            </DialogPopup>
          </Dialog>
        </ListItemActions>
      )}
    </ListItem>
  );
}
