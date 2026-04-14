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
import { Field, FieldControl, FieldError } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Textarea } from "@coss/ui/components/textarea";
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
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const form = useForm<FormValues>();

  const mutation = trpc.viewer.saml.update.useMutation({
    async onSuccess() {
      toastManager.add({
        title: t("sso_connection_created_successfully", { connectionType: "SAML" }),
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
          <ListItemTitle>{t("sso_saml_heading")}</ListItemTitle>
          <ListItemDescription>{t("sso_saml_description")}</ListItemDescription>
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
            <DialogTrigger render={<Button variant="outline">{t("configure")}</Button>} />
            <DialogPopup>
              <Form
                className="contents"
                onSubmit={form.handleSubmit((values) => {
                  mutation.mutate({
                    teamId,
                    encodedRawMetadata: Buffer.from(values.metadata).toString("base64"),
                  });
                })}>
                <DialogHeader>
                  <DialogTitle>{t("sso_saml_configuration_title")}</DialogTitle>
                  <DialogDescription>{t("sso_saml_configuration_description")}</DialogDescription>
                </DialogHeader>
                <DialogPanel>
                  <Controller
                    control={form.control}
                    name="metadata"
                    rules={{ required: t("field_required") }}
                    render={({
                      field: { ref, name, value, onBlur, onChange },
                      fieldState: { invalid, error },
                    }) => (
                      <Field name={name} invalid={invalid}>
                        <FieldControl
                          render={<Textarea rows={6} className="*:field-sizing-fixed *:min-h-0" />}
                          ref={ref}
                          id={name}
                          name={name}
                          data-testid="saml_config"
                          placeholder={t("saml_configuration_placeholder")}
                          value={value ?? ""}
                          onBlur={onBlur}
                          onChange={(e) => onChange(e.target.value)}      
                          aria-label={t("saml_configuration_placeholder")}                      
                        />
                        <FieldError match={!!error}>{error?.message}</FieldError>
                      </Field>
                    )}
                  />
                </DialogPanel>
                <DialogFooter>
                  <DialogClose
                    render={
                      <Button variant="ghost">
                        {t("cancel")}
                      </Button>
                    }
                  />
                  <Button type="submit" disabled={form.formState.isSubmitting}>
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
