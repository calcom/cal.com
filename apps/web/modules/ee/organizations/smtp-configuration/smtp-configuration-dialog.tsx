"use client";

import { useLocale } from "@calcom/i18n/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogClose, DialogContent } from "@calcom/ui/components/dialog";
import { Divider } from "@calcom/ui/components/divider";
import { Form, Label, TextField } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

export type SmtpConfiguration = NonNullable<
  RouterOutputs["viewer"]["organizations"]["getSmtpConfiguration"]
>;

const formSchema = z.object({
  fromEmail: z.string().email(),
  fromName: z.string().min(1),
  smtpHost: z.string().min(1),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpSecure: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface SmtpConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config?: SmtpConfiguration;
}

const encryptionOptions = [
  { value: "ssl", label: "SSL" },
  { value: "starttls", label: "STARTTLS" },
];

const SmtpConfigurationDialog = ({ open, onOpenChange, config }: SmtpConfigurationDialogProps) => {
  const isEditing = !!config;
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);

  const getDefaultValues = (cfg?: SmtpConfiguration): FormValues => ({
    fromEmail: cfg?.fromEmail ?? "",
    fromName: cfg?.fromName ?? "",
    smtpHost: cfg?.smtpHost ?? "",
    smtpPort: cfg?.smtpPort ?? 465,
    smtpUser: "",
    smtpPassword: "",
    smtpSecure: cfg?.smtpSecure ?? true,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(config),
  });

  const smtpHost = form.watch("smtpHost");
  const smtpPort = form.watch("smtpPort");
  const smtpUser = form.watch("smtpUser");
  const smtpPassword = form.watch("smtpPassword");
  const smtpSecure = form.watch("smtpSecure");

  const connectionFieldsChanged =
    isEditing && config
      ? smtpHost !== config.smtpHost ||
        smtpPort !== config.smtpPort ||
        smtpSecure !== config.smtpSecure ||
        !!smtpUser ||
        !!smtpPassword
      : false;

  const requiresTest = isEditing ? connectionFieldsChanged : true;

  const { isDirty } = form.formState;
  const connectionStatus = connectionResult && !isDirty ? connectionResult : null;

  const mutationCallbacks = {
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  };

  const testConnectionMutation = trpc.viewer.organizations.testSmtpConnection.useMutation({
    onSuccess: (result) => {
      setConnectionResult({ success: result.success, error: result.error });
      // Reset defaults to current values so dirtyFields tracks changes from this point
      form.reset(form.getValues(), { keepErrors: true, keepTouched: true });
      showToast(
        result.success ? t("smtp_connection_success") : result.error || t("smtp_connection_failed"),
        result.success ? "success" : "error"
      );
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
    onSettled: () => {
      setIsTesting(false);
    },
  });

  const onMutationSuccess = (toastKey: string) => ({
    onSuccess: () => {
      showToast(t(toastKey), "success");
      utils.viewer.organizations.getSmtpConfiguration.invalidate();
      onOpenChange(false);
      form.reset();
      setConnectionResult(null);
    },
    ...mutationCallbacks,
  });

  const createMutation = trpc.viewer.organizations.createSmtpConfiguration.useMutation(
    onMutationSuccess("smtp_configuration_created")
  );

  const updateMutation = trpc.viewer.organizations.updateSmtpConfiguration.useMutation(
    onMutationSuccess("smtp_configuration_updated")
  );

  const handleTestConnection = () => {
    const values = form.getValues();
    if (!values.smtpHost || !values.smtpPort) {
      showToast(t("fill_smtp_fields"), "error");
      return;
    }
    if (!isEditing && (!values.smtpUser || !values.smtpPassword)) {
      showToast(t("fill_smtp_fields"), "error");
      return;
    }
    setIsTesting(true);
    testConnectionMutation.mutate({
      smtpHost: values.smtpHost,
      smtpPort: Number(values.smtpPort),
      ...(values.smtpUser ? { smtpUser: values.smtpUser } : {}),
      ...(values.smtpPassword ? { smtpPassword: values.smtpPassword } : {}),
      smtpSecure: values.smtpSecure,
    });
  };

  const onSubmit = (values: FormValues) => {
    setIsSubmitting(true);

    if (isEditing && config) {
      updateMutation.mutate({
        fromEmail: values.fromEmail !== config.fromEmail ? values.fromEmail : undefined,
        fromName: values.fromName !== config.fromName ? values.fromName : undefined,
        smtpHost: values.smtpHost !== config.smtpHost ? values.smtpHost : undefined,
        smtpPort: values.smtpPort !== config.smtpPort ? values.smtpPort : undefined,
        smtpUser: values.smtpUser || undefined,
        smtpPassword: values.smtpPassword || undefined,
        smtpSecure: values.smtpSecure !== config.smtpSecure ? values.smtpSecure : undefined,
      });
    } else {
      createMutation.mutate({
        ...values,
        smtpUser: values.smtpUser || "",
        smtpPassword: values.smtpPassword || "",
        smtpSecure: values.smtpSecure,
      });
    }
  };

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setConnectionResult(null);
      form.reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="p-0">
        <Form form={form} handleSubmit={onSubmit}>
          <div className="space-y-4 p-6">
            <h2 className="font-cal text-emphasis text-lg font-semibold">{t("smtp_setup")}</h2>

            <TextField label={t("name")} placeholder={t("name")} {...form.register("fromName")} />
            <TextField
              label={t("sending_email_address")}
              placeholder={t("email")}
              {...form.register("fromEmail")}
            />
            <TextField
              label={t("smtp_username")}
              placeholder={isEditing ? t("smtp_username_placeholder") : undefined}
              {...form.register("smtpUser")}
            />
            <TextField
              type="password"
              label={t("smtp_password")}
              placeholder={isEditing ? t("smtp_password_placeholder") : undefined}
              {...form.register("smtpPassword")}
            />

            <Divider className="my-6" />

            <TextField label={t("smtp_host")} placeholder="smtp.example.com" {...form.register("smtpHost")} />
            <TextField
              type="number"
              label={t("smtp_port")}
              placeholder="465"
              {...form.register("smtpPort")}
              disabled={form.watch("smtpSecure")}
            />

            <div>
              <Label>{t("smtp_encryption")}</Label>
              <Controller
                name="smtpSecure"
                control={form.control}
                render={({ field }) => (
                  <Select
                    options={encryptionOptions}
                    value={encryptionOptions.find((o) =>
                      field.value ? o.value === "ssl" : o.value === "starttls"
                    )}
                    onChange={(option) => {
                      if (!option) return;
                      const isSSL = option.value === "ssl";
                      field.onChange(isSSL);
                      form.setValue("smtpPort", isSSL ? 465 : 587);
                    }}
                  />
                )}
              />
            </div>

            {requiresTest && (
              <div className="flex items-center gap-3">
                <Button type="button" color="secondary" onClick={handleTestConnection} loading={isTesting}>
                  {t("test_connection")}
                </Button>
                {connectionStatus &&
                  (connectionStatus.success ? (
                    <Badge variant="green" startIcon="circle-check">
                      {t("connection_successful")}
                    </Badge>
                  ) : (
                    <Badge variant="red" startIcon="circle-x">
                      {t("connection_failed")}
                    </Badge>
                  ))}
              </div>
            )}
          </div>

          <div className="border-subtle flex items-center justify-end gap-2 border-t px-6 py-4">
            <DialogClose />
            {requiresTest && !connectionStatus?.success ? (
              <Tooltip content={t("test_connection_first")}>
                <span>
                  <Button type="submit" loading={isSubmitting} disabled>
                    {isEditing ? t("save") : t("create")}
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button type="submit" loading={isSubmitting}>
                {isEditing ? t("save") : t("create")}
              </Button>
            )}
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SmtpConfigurationDialog;
