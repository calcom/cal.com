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

export const ADD_CALDAV_INTEGRATION_FORM_TITLE = "addCalDav";
export type AddCalDavIntegrationRequest = {
  url: string;
  username: string;
  password: string;
};

export function AddCalDavIntegrationModal(props: DialogProps) {
  const form = useForm({
    defaultValues: {
      url: "",
      username: "",
      password: "",
    },
  });
  const [errorMessage, setErrorMessage] = useState("");
  return (
    <Dialog {...props}>
      <DialogContent>
        <DialogHeader
          title="Connect to CalDav Server"
          subtitle="Your credentials will be stored and encrypted."
        />

        <Form
          form={form}
          handleSubmit={async (values) => {
            setErrorMessage("");
            const res = await fetch("/api/integrations/caldav/add", {
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
              label="Calendar URL"
              placeholder="https://example.com/calendar"
            />
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
const AddCalDavIntegration = React.forwardRef<HTMLFormElement, Props>((props, ref) => {
  const onSubmit = (event: any) => {
    event.preventDefault();
    event.stopPropagation();

    props.onSubmit();
  };

  return (
    <form id={ADD_CALDAV_INTEGRATION_FORM_TITLE} ref={ref} onSubmit={onSubmit}>
      <div className="mb-2">
        <label htmlFor="url" className="block text-sm font-medium text-gray-700">
          Calendar URL
        </label>
        <div className="mt-1 flex rounded-md shadow-sm">
          <input
            required
            type="text"
            name="url"
            id="url"
            placeholder="https://example.com/calendar"
            className="focus:border-brand block w-full min-w-0 flex-grow rounded-none rounded-r-sm border-gray-300 lowercase focus:ring-black sm:text-sm"
          />
        </div>
      </div>
      <div className="mb-2">
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <input
          required
          type="text"
          name="username"
          id="username"
          placeholder="rickroll"
          className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
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
          className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
        />
      </div>
    </form>
  );
});

AddCalDavIntegration.displayName = "AddCalDavIntegrationForm";
export default AddCalDavIntegration;
