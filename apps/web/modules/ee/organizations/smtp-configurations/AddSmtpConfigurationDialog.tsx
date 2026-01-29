"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogHeader } from "@calcom/ui/components/dialog";
import { Divider } from "@calcom/ui/components/divider";
import { Form, Switch, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  fromEmail: z.string().email(),
  fromName: z.string().min(1),
  smtpHost: z.string().min(1),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpUser: z.string().min(1),
  smtpPassword: z.string().min(1),
  smtpSecure: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddSmtpConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddSmtpConfigurationDialog = ({ open, onOpenChange }: AddSmtpConfigurationDialogProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success: boolean;
    error?: string;
  } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromEmail: "",
      fromName: "",
      smtpHost: "",
      smtpPort: 587,
      smtpUser: "",
      smtpPassword: "",
      smtpSecure: false,
    },
  });

  const smtpHost = form.watch("smtpHost");
  const smtpPort = form.watch("smtpPort");
  const smtpUser = form.watch("smtpUser");
  const smtpPassword = form.watch("smtpPassword");

  useEffect(() => {
    if (connectionStatus) {
      setConnectionStatus(null);
    }
  }, [smtpHost, smtpPort, smtpUser, smtpPassword]);

  const testConnectionMutation = trpc.viewer.organizations.testSmtpConnection.useMutation({
    onSuccess: (result) => {
      setConnectionStatus({
        tested: true,
        success: result.success,
        error: result.error,
      });
      if (result.success) {
        showToast(t("smtp_connection_success"), "success");
      } else {
        showToast(result.error || t("smtp_connection_failed"), "error");
      }
    },
    onError: (error) => {
      setConnectionStatus({
        tested: true,
        success: false,
        error: error.message,
      });
      showToast(error.message, "error");
    },
    onSettled: () => {
      setIsTesting(false);
    },
  });

  const createMutation = trpc.viewer.organizations.createSmtpConfiguration.useMutation({
    onSuccess: () => {
      showToast(t("smtp_configuration_created"), "success");
      utils.viewer.organizations.listSmtpConfigurations.invalidate();
      onOpenChange(false);
      form.reset();
      setConnectionStatus(null);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleTestConnection = () => {
    const values = form.getValues();
    if (!values.smtpHost || !values.smtpPort || !values.smtpUser || !values.smtpPassword) {
      showToast(t("fill_smtp_fields"), "error");
      return;
    }
    setIsTesting(true);
    setConnectionStatus(null);
    testConnectionMutation.mutate({
      smtpHost: values.smtpHost,
      smtpPort: Number(values.smtpPort),
      smtpUser: values.smtpUser,
      smtpPassword: values.smtpPassword,
      smtpSecure: values.smtpSecure,
    });
  };

  const onSubmit = (values: FormValues) => {
    setIsSubmitting(true);
    createMutation.mutate({
      fromEmail: values.fromEmail,
      fromName: values.fromName,
      smtpHost: values.smtpHost,
      smtpPort: values.smtpPort,
      smtpUser: values.smtpUser,
      smtpPassword: values.smtpPassword,
      smtpSecure: values.smtpSecure,
    });
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
              title={t("add_smtp_configuration")}
              subtitle={t("add_smtp_configuration_description")}
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
                <TextField label={t("smtp_username")} {...form.register("smtpUser")} />
                <TextField type="password" label={t("smtp_password")} {...form.register("smtpPassword")} />
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
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 bg-muted px-4 py-3">
            <DialogClose />
            <Button type="submit" loading={isSubmitting} disabled={!connectionStatus?.success}>
              {t("create")}
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSmtpConfigurationDialog;
