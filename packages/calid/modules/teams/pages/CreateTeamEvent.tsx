"use client";

import { Button } from "@calid/features/ui/components/button";
import { Form } from "@calid/features/ui/components/form";
import { TextField } from "@calid/features/ui/components/input/input";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useRouter } from "next/navigation";
import { Controller } from "react-hook-form";

import { useCreateEventType } from "@calcom/lib/hooks/useCreateEventType";
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

  const onSuccess = () => {
    router.push(`/settings/teams/${teamId}/profile`);
  };

  const onError = (message: string) => {
    triggerToast(message, "error");
  };

  const {
    form,
    createMutation,
    isManagedEventType: _isManagedEventType,
  } = useCreateEventType(onSuccess, onError);

  if (!Number.isFinite(teamId) || teamId <= 0) return null;

  return (
    <Form
      form={form}
      handleSubmit={(values) => {
        if (!createMutation.isPending) {
          createMutation.mutate(values);
        }
      }}>
      <div className="space-y-6">
        <Controller
          name="teamId"
          control={form.control}
          defaultValue={teamId}
          render={() => (
            <input type="hidden" value={teamId} {...form.register("teamId", { valueAsNumber: true })} />
          )}
        />

        <Controller
          name="title"
          control={form.control}
          rules={{ required: t("title") as unknown as string }}
          render={({ field: { value } }) => (
            <TextField
              label={t("title")}
              placeholder={t("quick_chat")}
              value={value}
              onChange={(e) => {
                const next = e?.target.value;
                form.setValue("title", next);
                if (form.formState.touchedFields["slug"] === undefined) {
                  form.setValue("slug", slugify(next));
                }
              }}
              data-testid="event-type-title"
            />
          )}
        />

        <Controller
          name="slug"
          control={form.control}
          rules={{ required: t("team_url_required") as unknown as string }}
          render={({ field: { value } }) => (
            <TextField
              label={t("team_url")}
              placeholder="quick-chat"
              value={value}
              onChange={(e) => {
                form.setValue("slug", slugify(e?.target.value, true), { shouldTouch: true });
                form.clearErrors("slug");
              }}
              data-testid="event-type-slug"
            />
          )}
        />

        <Controller
          name="length"
          control={form.control}
          defaultValue={15}
          render={({ field: { value, onChange } }) => (
            <TextField
              type="number"
              label={t("duration")}
              placeholder="30"
              value={value}
              onChange={(e) => onChange(Number(e?.target.value))}
              data-testid="event-type-duration"
            />
          )}
        />

        <Controller
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

        <Controller
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
            disabled={createMutation.isPending}>
            {t("back")}
          </Button>
          <Button
            data-testid="finish-button"
            type="submit"
            color="primary"
            className="w-full justify-center"
            disabled={createMutation.isPending}>
            {t("finish")}
          </Button>
        </div>
      </div>
    </Form>
  );
};

export default CreateTeamEvent;
