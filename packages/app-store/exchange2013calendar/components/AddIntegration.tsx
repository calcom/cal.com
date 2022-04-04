import React, { useState } from "react";
import { useForm } from "react-hook-form";

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
        <DialogHeader
          title="Connect to Exchange Server"
          subtitle="Your credentials will be stored and encrypted."
        />

        <Form
          form={form}
          onSubmit={form.handleSubmit(async (values) => {
            setErrorMessage("");
            const res = await fetch("/api/integrations/exchange2013calendar/add", {
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
          })}>
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
                Cancel
              </Button>
            </DialogClose>

            <Button type="submit" loading={form.formState.isSubmitting}>
              Save
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default AddExchangeIntegrationModal;
