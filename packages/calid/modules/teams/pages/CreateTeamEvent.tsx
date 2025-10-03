"use client";

import { Button } from "@calid/features/ui/components/button";
import { Form, FormField } from "@calid/features/ui/components/form";
import { TextField, NumberInput } from "@calid/features/ui/components/input/input";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useCalIdCreateEventType } from "@calcom/lib/hooks/useCreateEventType";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import slugify from "@calcom/lib/slugify";
import { SchedulingType } from "@calcom/prisma/enums";
import { Select } from "@calcom/ui/components/form";

type SchedulingOption = { value: SchedulingType; label: string };

const CreateTeamEvent = () => {
  const params = useParamsWithFallback();
  const router = useRouter();
  const { t } = useLocale();

  const teamId = Number(params.id);

  const onSuccess = (eventType: any) => {
    router.push(`/settings/teams/${teamId}/profile`);
  };

  const onError = (message: string) => {
    triggerToast(message, "error");
  };

  const {
    form,
    createMutation,
    isManagedEventType: _isManagedEventType,
  } = useCalIdCreateEventType(onSuccess, onError);

  useEffect(() => {
    form.reset({
      calIdTeamId: teamId,
      schedulingType: SchedulingType.COLLECTIVE,
      title: "",
      slug: "",
      description: "",
      length: 15,
      hidden: false,
    });
  }, [form, teamId]);

  if (!Number.isFinite(teamId) || teamId <= 0) return null;

  const {
    formState: { isSubmitting, isDirty, isValid },
    watch,
  } = form;

  // Watch required fields for validation
  const title = watch("title") || "";
  const slug = watch("slug") || "";
  const isFormValid = title && slug && title.trim() !== "" && slug.trim() !== "";
  
  return (
    <Form
      form={form}
      onSubmit={(values) => {
        if (!createMutation.isPending) {
          createMutation.mutate(values);
        }
      }}>
      <div className="space-y-6">
        <FormField
          name="calIdTeamId"
          control={form.control}
          render={() => (
            <input type="hidden" {...form.register("calIdTeamId", { valueAsNumber: true })} />
          )}
        />

        <FormField
          name="title"
          control={form.control}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <TextField
              label={t("title")}
              placeholder={t("quick_chat")}
              value={value || ""}
              onChange={(e) => {
                const next = e?.target.value;
                onChange(next);
                if (form.formState.touchedFields["slug"] === undefined) {
                  form.setValue("slug", slugify(next));
                }
              }}
              data-testid="event-type-title"
              error={error ? error.message : undefined}
            />
          )}
        />

        <FormField
          name="slug"
          control={form.control}
          render={({ field: { value } }) => (
            <TextField
              label={t("team_url")}
              placeholder="quick-chat"
              value={value || ""}
              onChange={(e) => {
                form.setValue("slug", slugify(e?.target.value, true), { shouldTouch: true });
                form.clearErrors("slug");
              }}
              data-testid="event-type-slug"
            />
          )}
        />

        <FormField
          name="length"
          control={form.control}
          defaultValue={15}
          render={({ field: { value, onChange } }) => (
            <NumberInput
              label={t("duration")}
              placeholder="30"
              value={value || 15}
              onChange={(e) => onChange(Number(e?.target.value))}
              data-testid="event-type-duration"
            />
          )}
        />

        <FormField
          name="schedulingType"
          control={form.control}
          defaultValue={SchedulingType.COLLECTIVE}
          render={({ field: { onChange, value } }) => (
            <div>
              <label className="mb-2 block text-sm font-medium">{t("scheduling_type")}</label>
              <Select<SchedulingOption>
                id="schedulingType"
                options={[
                  { value: SchedulingType.COLLECTIVE, label: "Collective" },
                  { value: SchedulingType.ROUND_ROBIN, label: "Round Robin" },
                  { value: SchedulingType.MANAGED, label: "Managed" },
                ]}
                defaultValue={{
                  value: value ?? SchedulingType.COLLECTIVE,
                  label: (value ?? SchedulingType.COLLECTIVE).toString().replace("_", " "),
                }}
                onChange={(val: SchedulingOption | null) => {
                  if (val) onChange(val.value);
                }}
              />
            </div>
          )}
        />

        <FormField
          name="description"
          control={form.control}
          render={({ field: { value, onChange } }) => (
            <TextField
              label={t("description")}
              placeholder={t("description")}
              value={value ?? ""}
              onChange={(e) => onChange(e?.target.value)}
            />
          )}
        />

        <div className="flex space-x-2 rtl:space-x-reverse">
          <Button
            color="secondary"
            className="w-full justify-center"
            type="button"
            onClick={() => router.push(`/settings/teams/${teamId}/onboard-members`)}
            disabled={createMutation.isPending || isSubmitting}>
            {t("back")}
          </Button>
          <Button
            data-testid="finish-button"
            type="submit"
            color="primary"
            className="w-full justify-center"
            disabled={createMutation.isPending || isSubmitting}
            >
            {t("finish")}
          </Button>
        </div>
      </div>
    </Form>
  );
};

export default CreateTeamEvent;
