import { useState } from "react";
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

export const ADD_INTEGRATION_FORM_TITLE = "addAppleIntegration";

function AddIntegrationModal(props: DialogProps) {
  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });
  const [errorMessage, setErrorMessage] = useState("");
  return (
    <Dialog name={ADD_INTEGRATION_FORM_TITLE} {...props}>
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
            const res = await fetch("/api/integrations/applecalendar/add", {
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

export default AddIntegrationModal;
