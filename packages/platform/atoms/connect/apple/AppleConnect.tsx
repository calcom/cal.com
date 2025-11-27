"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { FC } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";
import { PasswordField } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";

import { SUCCESS_STATUS } from "../../../constants/api";
import { useCheck } from "../../hooks/connect/useCheck";
import { useSaveCalendarCredentials } from "../../hooks/connect/useConnect";
import { AtomsWrapper } from "../../src/components/atoms-wrapper";
import { useToast } from "../../src/components/ui/use-toast";
import { cn } from "../../src/lib/utils";
import { ConnectedCalendarsTooltip } from "../OAuthConnect";
import type { OAuthConnectProps } from "../OAuthConnect";

export const AppleConnect: FC<Partial<Omit<OAuthConnectProps, "redir">>> = ({
  label,
  alreadyConnectedLabel,
  loadingLabel,
  className,
  initialData,
  isMultiCalendar = false,
  tooltip,
  tooltipSide = "bottom",
  isClickable,
  onSuccess,
  isDryRun = false,
}) => {
  const { t } = useLocale();
  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });
  const { toast } = useToast();
  const { allowConnect, checked, refetch } = useCheck({
    calendar: "apple",
    initialData,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  let displayedLabel = label || t("apple_connect_atom_label");

  const { mutate: saveCredentials, isPending: isSaving } = useSaveCalendarCredentials({
    onSuccess: (res) => {
      if (res.status === SUCCESS_STATUS) {
        form.reset();
        setIsDialogOpen(false);
        refetch();
        toast({
          description: "Calendar credentials added successfully",
        });
        onSuccess?.();
      }
    },
    onError: (err) => {
      toast({
        description: `Error: ${err}`,
      });
    },
  });

  const isChecking = !checked;
  const isDisabled = isChecking || !allowConnect;

  if (isChecking) {
    displayedLabel = loadingLabel || t("apple_connect_atom_loading_label");
  } else if (!allowConnect) {
    displayedLabel = alreadyConnectedLabel || t("apple_connect_atom_already_connected_label");
  }

  return (
    <AtomsWrapper>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <>
            {isMultiCalendar && (
              <Button
                StartIcon="calendar-days"
                color="primary"
                disabled={isClickable ? false : isChecking}
                tooltip={tooltip ? tooltip : <ConnectedCalendarsTooltip calendarInstance="apple" />}
                tooltipSide={tooltipSide}
                tooltipOffset={10}
                tooltipClassName="p-0 text-inherit bg-inherit"
                className={cn("", !isDisabled && "cursor-pointer", "border-none md:rounded-md", className)}
                onClick={() => setIsDialogOpen(true)}>
                {displayedLabel}
              </Button>
            )}
            {!isMultiCalendar && (
              <Button
                StartIcon="calendar-days"
                color="primary"
                disabled={isDisabled}
                className={cn(
                  "",
                  isDisabled && "cursor-not-allowed",
                  !isDisabled && "cursor-pointer",
                  "border-none md:rounded-md",
                  className
                )}
                onClick={() => setIsDialogOpen(true)}>
                {displayedLabel}
              </Button>
            )}
          </>
        </DialogTrigger>
        <DialogContent className="bg-default text-default">
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
            handleSubmit={async (values) => {
              const { username, password } = values;

              if (isDryRun) {
                form.reset();
                setIsDialogOpen(false);
                toast({
                  description: "Calendar credentials added successfully",
                });
                onSuccess?.();
              } else {
                await saveCredentials({ calendar: "apple", username, password });
              }
            }}>
            <fieldset
              className="stack-y-4"
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
                label="Password"
                placeholder="•••••••••••••"
                autoComplete="password"
                data-testid="apple-calendar-password"
              />
            </fieldset>
            <div className="mt-5 justify-end space-x-2 rtl:space-x-reverse sm:mt-4 sm:flex">
              <Button
                disabled={isSaving}
                type="button"
                color="secondary"
                className="md:rounded-md"
                onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={isSaving}
                type="submit"
                className="border-none md:rounded-md"
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
