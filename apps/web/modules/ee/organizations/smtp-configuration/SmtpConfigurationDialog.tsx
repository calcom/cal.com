"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogHeader } from "@calcom/ui/components/dialog";
import { Divider } from "@calcom/ui/components/divider";
import { Form, Switch, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export type SmtpConfiguration = NonNullable<
  RouterOutputs["viewer"]["organizations"]["listSmtpConfigurations"]
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

const SmtpConfigurationDialog = ({ open, onOpenChange, config }: SmtpConfigurationDialogProps) => {
  const isEditing = !!config;
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
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

  const connectionFieldsChanged =
    isEditing && config
      ? smtpHost !== config.smtpHost || smtpPort !== config.smtpPort || !!smtpUser || !!smtpPassword
      : false;

  const requiresTest = isEditing ? connectionFieldsChanged : true;

  useEffect(() => {
    if (config) {
      form.reset(getDefaultValues(config));
    }
  }, [config, form]);

  useEffect(() => {
    setConnectionStatus(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smtpHost, smtpPort, smtpUser, smtpPassword]);

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
      setConnectionStatus({ tested: true, success: result.success, error: result.error });
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
      utils.viewer.organizations.listSmtpConfigurations.invalidate();
      onOpenChange(false);
      form.reset();
      setConnectionStatus(null);
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
    setConnectionStatus(null);
    testConnectionMutation.mutate({
      ...(isEditing && config ? { configId: config.id } : {}),
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
        id: config.id,
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
      setConnectionStatus(null);
      form.reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="p-0">
        <Form form={form} handleSubmit={onSubmit}>
          <div className="space-y-6 p-4">
            <DialogHeader
              title={isEditing ? t("edit_smtp_configuration") : t("add_smtp_configuration")}
              subtitle={
                isEditing ? t("edit_smtp_configuration_description") : t("add_smtp_configuration_description")
              }
            />
            <div className="mt-2 stack-y-4">
              <TextField
                label={t("from_email")}
                placeholder="notifications@yourcompany.com"
                {...form.register("fromEmail")}
              />
              <TextField
                label={t("from_name")}
                placeholder={t("from_name_placeholder")}
                {...form.register("fromName")}
              />

              <Divider />
              <h3 className="text-emphasis mb-4 text-sm font-medium">{t("smtp_configuration")}</h3>

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label={t("smtp_host")}
                  placeholder="smtp.example.com"
                  {...form.register("smtpHost")}
                />
                <TextField
                  type="number"
                  label={t("smtp_port")}
                  placeholder="587"
                  disabled={form.watch("smtpSecure")}
                  {...form.register("smtpPort")}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
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
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <label className="text-emphasis text-sm font-medium">{t("smtp_secure")}</label>
                  <p className="text-subtle text-xs">{t("smtp_secure_description")}</p>
                </div>
                <Switch
                  checked={form.watch("smtpSecure")}
                  onCheckedChange={(checked) => {
                    form.setValue("smtpSecure", checked);
                    if (checked) {
                      form.setValue("smtpPort", 465);
                    } else {
                      form.setValue("smtpPort", 587);
                    }
                    setConnectionStatus(null);
                  }}
                />
              </div>

              {requiresTest && (
                <div className="mt-4 flex items-center gap-3">
                  <Button type="button" color="secondary" onClick={handleTestConnection} loading={isTesting}>
                    {t("test_connection")}
                  </Button>
                  {connectionStatus?.tested &&
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
          </div>

          <div className="flex items-center justify-end gap-2 bg-muted px-4 py-3">
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
