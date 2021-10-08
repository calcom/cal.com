import React, { useState } from "react";
import { useForm } from "react-hook-form";

import {
  DialogHeader,
  DialogProps,
  Dialog,
  DialogContent,
  DialogClose,
  DialogFooter,
} from "@components/Dialog";
import { Form, TextField } from "@components/form/fields";
import { Alert } from "@components/ui/Alert";
import Button from "@components/ui/Button";

type Props = {
  onSubmit: () => void;
};

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
          onSubmit={form.handleSubmit(async (values) => {
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
          })}>
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

/**
 * @deprecated
 */
const AddAppleIntegration = React.forwardRef<HTMLFormElement, Props>((props, ref) => {
  const onSubmit = (event) => {
    event.preventDefault();
    event.stopPropagation();

    props.onSubmit();
  };

  return (
    <form id={ADD_APPLE_INTEGRATION_FORM_TITLE} ref={ref} onSubmit={onSubmit}>
      <div className="mb-2">
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <input
          required
          type="text"
          name="username"
          id="username"
          placeholder="email@icloud.com"
          className="mt-1 block w-full border border-gray-300 rounded-sm shadow-sm py-2 px-3 focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
        />
      </div>
      <div className="mb-2">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          required
          type="password"
          name="password"
          id="password"
          placeholder="•••••••••••••"
          className="mt-1 block w-full border border-gray-300 rounded-sm shadow-sm py-2 px-3 focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
        />
      </div>
    </form>
  );
});

AddAppleIntegration.displayName = "AddAppleIntegrationForm";
export default AddAppleIntegration;
