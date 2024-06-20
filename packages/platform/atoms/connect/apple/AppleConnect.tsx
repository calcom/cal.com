import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from "@/components/ui/dialog";
import type { FC } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button, Form, PasswordField, TextField } from "@calcom/ui";

import { AtomsWrapper } from "../../src/components/atoms-wrapper";
import { cn } from "../../src/lib/utils";
import type { OAuthConnectProps } from "../OAuthConnect";

export const AppleConnect: FC<Partial<Omit<OAuthConnectProps, "redir">>> = ({
  label = "Connect Apple Calendar",
  className,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const displayedLabel = label;
  const isDisabled = false;

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  return (
    <AtomsWrapper>
      <Dialog open={isDialogOpen}>
        <DialogTrigger>
          <Button
            StartIcon="calendar-days"
            color="primary"
            disabled={isDisabled}
            className={cn("", className, isDisabled && "cursor-not-allowed", !isDisabled && "cursor-pointer")}
            onClick={() => setIsDialogOpen(true)}>
            {displayedLabel}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect to Apple Server</DialogTitle>
            <DialogDescription>
              Generate an app specific password to use with Cal.com at{" "}
              <span className="font-bold">https://appleid.apple.com/account/manage</span>. Your credentials
              will be stored and encrypted.
            </DialogDescription>
          </DialogHeader>
          <Form
            form={form}
            handleSubmit={(values) => {
              console.log(values);
              setIsDialogOpen(false);
              form.reset();
            }}>
            <fieldset
              className="space-y-4"
              disabled={form.formState.isSubmitting}
              data-testid="apple-calendar-form">
              <TextField
                required
                type="text"
                {...form.register("username")}
                label="Apple ID"
                placeholder="appleid@domain.com"
                data-testid="apple-calendar-email"
              />
              <PasswordField
                required
                {...form.register("password")}
                label="password"
                placeholder="•••••••••••••"
                autoComplete="password"
                data-testid="apple-calendar-password"
              />
            </fieldset>
            <div className="mt-5 justify-end space-x-2 rtl:space-x-reverse sm:mt-4 sm:flex">
              <Button type="button" color="secondary" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={form.formState.isSubmitting}
                data-testid="apple-calendar-login-button">
                Save
              </Button>
            </div>
          </Form>
        </DialogContent>
      </Dialog>
    </AtomsWrapper>
  );
};
