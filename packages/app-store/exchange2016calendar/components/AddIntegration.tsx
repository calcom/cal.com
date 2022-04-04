import React, { useState } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/Alert";
import Button from "@calcom/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogProps,
} from "@calcom/ui/Dialog";
import { Form, TextField } from "@calcom/ui/form/fields";

export const ADD_APPLE_INTEGRATION_FORM_TITLE = "addExchangeIntegration";

export function AddExchangeIntegrationModal(props: DialogProps) {
  const { t } = useLocale();

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
      url: process.env.EXCHANGE_DEFAULT_EWS_URL || "",
    },
  });
  const [errorMessage, setErrorMessage] = useState("");
  return (
    <Dialog {...props}>
      <DialogContent>
        <DialogHeader title="Connect to Exchange Server" subtitle={t("your_credentials_will")} />

        <Form
          form={form}
          handleSubmit={async (values) => {
            setErrorMessage("");
            const res = await fetch("/api/integrations/exchange2016calendar/add", {
              method: "POST",
              body: JSON.stringify(values),
              headers: {
                "Content-Type": "application/json",
              },
            });
            const json = await res.json();
            if (!res.ok) {
              setErrorMessage(json?.message || "Something went wrong");
            } else {
              props.onOpenChange?.(false);
            }
          }}>
          <fieldset className="space-y-2" disabled={form.formState.isSubmitting}>
            <TextField
              required
              type="text"
              {...form.register("url")}
              label="Exchange EWS URL"
              placeholder="https://example.com/Ews/Exchange.asmx"
            />
            <TextField
              required
              type="text"
              {...form.register("username")}
              label="E-Mail"
              placeholder="rickroll@example.com"
            />
            <TextField
              required
              type="password"
              {...form.register("password")}
              label="Password"
              placeholder="•••••••••••••"
              autoComplete="password"
            />
          </fieldset>

          {errorMessage && <Alert severity="error" title={errorMessage} className="my-4" />}
          <DialogFooter>
            <DialogClose
              onClick={() => {
                props.onOpenChange?.(false);
              }}
              asChild>
              <Button type="button" color="secondary" tabIndex={-1}>
                {t("cancel")}
              </Button>
            </DialogClose>

            <Button type="submit" loading={form.formState.isSubmitting}>
              {t("save")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default AddExchangeIntegrationModal;
