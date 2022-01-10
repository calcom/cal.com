import React, { useState } from "react";
import { useForm } from "react-hook-form";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogProps,
} from "@components/Dialog";
import { Form, TextField } from "@components/form/fields";
import { Alert } from "@components/ui/Alert";
import Button from "@components/ui/Button";

export const ADD_APPLE_INTEGRATION_FORM_TITLE = "addAppleIntegration";

export function AddAppleIntegrationModal(props: DialogProps) {
  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });
  const [errorMessage, setErrorMessage] = useState("");
  return (
    <Dialog {...props}>
      <DialogContent>
        <DialogHeader
          title="Connect to Apple Server"
          subtitle={
            <>
              Generate an app specific password to use with Cal.com at{" "}
              <a
                className="text-indigo-400"
                href="https://appleid.apple.com/account/manage"
                target="_blank"
                rel="noopener noreferrer">
                https://appleid.apple.com/account/manage
              </a>
              . Your credentials will be stored and encrypted.
            </>
          }
        />

        <Form
          form={form}
          handleSubmit={async (values) => {
            setErrorMessage("");
            const res = await fetch("/api/integrations/apple/add", {
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
              {...form.register("username")}
              label="Username"
              placeholder="rickroll"
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
