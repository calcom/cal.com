"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { Skeleton } from "@calcom/ui/components/skeleton";

type ConfigFormValues = {
  alertThreshold: number;
  lockThreshold: number;
  monitoringWindowDays: number;
};

export function AbuseConfigView() {
  const { t } = useLocale();

  const { data: config, isPending } = trpc.viewer.admin.abuseScoring.config.get.useQuery();
  const utils = trpc.useUtils();

  const form = useForm<ConfigFormValues>({
    defaultValues: {
      alertThreshold: 50,
      lockThreshold: 80,
      monitoringWindowDays: 7,
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        alertThreshold: config.alertThreshold,
        lockThreshold: config.lockThreshold,
        monitoringWindowDays: config.monitoringWindowDays,
      });
    }
  }, [config, form]);

  const updateConfig = trpc.viewer.admin.abuseScoring.config.update.useMutation({
    onSuccess: async () => {
      await utils.viewer.admin.abuseScoring.config.get.invalidate();
      showToast(t("config_updated"), "success");
    },
    onError: (error) => showToast(error.message, "error"),
  });

  const onSubmit = (values: ConfigFormValues) => {
    if (values.lockThreshold <= values.alertThreshold) {
      form.setError("lockThreshold", { message: t("lock_threshold_must_exceed_alert") });
      return;
    }
    updateConfig.mutate(values);
  };

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton as="div" className="h-10 w-full"><div /></Skeleton>
        <Skeleton as="div" className="h-10 w-full"><div /></Skeleton>
        <Skeleton as="div" className="h-10 w-full"><div /></Skeleton>
      </div>
    );
  }

  return (
    <Form form={form} handleSubmit={onSubmit} className="max-w-md space-y-6">
      <TextField
        type="number"
        label={t("alert_threshold")}
        hint={t("alert_threshold_description")}
        {...form.register("alertThreshold", { valueAsNumber: true, min: 0, max: 100 })}
      />

      <div>
        <TextField
          type="number"
          label={t("lock_threshold")}
          hint={t("lock_threshold_description")}
          {...form.register("lockThreshold", { valueAsNumber: true, min: 1, max: 100 })}
        />
        {form.formState.errors.lockThreshold && (
          <p className="text-error mt-1 text-xs">{form.formState.errors.lockThreshold.message}</p>
        )}
      </div>

      <TextField
        type="number"
        label={t("monitoring_window_days")}
        hint={t("monitoring_window_days_description")}
        {...form.register("monitoringWindowDays", { valueAsNumber: true, min: 1, max: 90 })}
      />

      <Button type="submit" color="primary" loading={updateConfig.isPending}>
        {t("save")}
      </Button>
    </Form>
  );
}
