"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useMemo } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { InternalNotePresetType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Form, Input, SettingsToggle } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

interface ProfileViewProps {
  team: RouterOutputs["viewer"]["teams"]["get"];
}

const OTHER_FIELD_ID = -1;

type FormValues = {
  presets: {
    id: number;
    name: string;
    cancellationReason?: string | undefined;
  }[];
};

interface PresetFieldsProps {
  fields: ReturnType<typeof useFieldArray<FormValues, "presets">>["fields"];
  control: ReturnType<typeof useForm<FormValues>>["control"];
  remove: (index: number) => void;
  append: (value: {
    id: number;
    name: string;
    cancellationReason?: string;
  }) => void;
  animateRef: React.RefObject<HTMLDivElement>;
}

function PresetFields({
  fields,
  control,
  remove,
  append,
  animateRef,
}: PresetFieldsProps) {
  const { t } = useLocale();

  return (
    <div className="border-subtle border border-y-0 p-6">
      <div className="flex flex-col stack-y-4" ref={animateRef}>
        {fields.map((field, index) => (
          <div key={field.id} className="stack-y-2">
            <div className="flex items-center space-x-2">
              <Controller
                name={`presets.${index}.name`}
                control={control}
                render={({ field }) => (
                  <Input
                    type="text"
                    {...field}
                    placeholder={t("internal_booking_note")}
                    className="mb-0!"
                  />
                )}
              />
              <Button
                type="button"
                color="destructive"
                variant="icon"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Icon name="trash" className="h-4 w-5" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="corner-down-right" className="h-4 w-4" />
              <Controller
                name={`presets.${index}.cancellationReason`}
                control={control}
                render={({ field }) => (
                  <Input
                    type="text"
                    {...field}
                    placeholder={t("internal_note_cancellation_reason")}
                    className="mb-0!"
                  />
                )}
              />
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        color="minimal"
        StartIcon="plus"
        onClick={() => append({ id: OTHER_FIELD_ID, name: "" })}
        className="mt-4"
      >
        {t("add_preset")}
      </Button>
    </div>
  );
}

interface PresetToggleProps {
  type: InternalNotePresetType;
  teamId: number;
  titleKey: string;
}

function PresetToggle({ type, teamId, titleKey }: PresetToggleProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [animateRef] = useAutoAnimate<HTMLDivElement>();

  const { data: _loadedPresets } =
    trpc.viewer.teams.getInternalNotesPresets.useQuery({
      teamId,
      type,
    });

  const loadedPresets = useMemo(() => {
    return (_loadedPresets ?? []).map(
      (preset: {
        id: number;
        name: string;
        cancellationReason: string | null;
      }) => ({
        ...preset,
        cancellationReason: preset.cancellationReason ?? undefined,
      })
    );
  }, [_loadedPresets]);

  const hasExistingPresets = loadedPresets.length > 0;

  const form = useForm<FormValues>({
    values: {
      presets: loadedPresets,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "presets",
  });

  const updatePresetsMutation =
    trpc.viewer.teams.updateInternalNotesPresets.useMutation({
      onSuccess: () => {
        showToast(t("internal_note_presets_updated_successfully"), "success");
        utils.viewer.teams.getInternalNotesPresets.invalidate();
      },
      onError: (error: { message?: string }) => {
        showToast(error.message || t("something_went_wrong"), "error");
      },
    });

  const onSubmit = async (data: FormValues) => {
    updatePresetsMutation.mutate({
      teamId,
      type,
      presets: data.presets,
    });
  };

  return (
    <Form form={form} handleSubmit={(e) => onSubmit(e)}>
      <Controller
        name="presets"
        render={({ field: { value } }) => {
          const isChecked = hasExistingPresets || (value && value.length > 0);
          return (
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
              labelClassName="text-sm"
              title={t(titleKey)}
              description={t("internal_note_presets_description")}
              checked={isChecked}
              childrenClassName="lg:ml-0"
              onCheckedChange={async (active) => {
                if (active && !value?.length) {
                  append({ id: OTHER_FIELD_ID, name: "" });
                } else {
                  replace([]);
                  if (!active && hasExistingPresets) {
                    updatePresetsMutation.mutate({
                      teamId,
                      type,
                      presets: [],
                    });
                  }
                }
              }}
              switchContainerClassName={classNames(
                "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
                isChecked && "rounded-b-none"
              )}
            >
              <PresetFields
                fields={fields}
                control={form.control}
                remove={remove}
                append={append}
                animateRef={animateRef}
              />
              <SectionBottomActions align="end">
                <Button
                  type="submit"
                  color="primary"
                  loading={updatePresetsMutation.isPending}
                >
                  {t("update")}
                </Button>
              </SectionBottomActions>
            </SettingsToggle>
          );
        }}
      />
    </Form>
  );
}

const InternalNotePresetsView = ({ team }: ProfileViewProps) => {
  const { t } = useLocale();

  const isAdmin = team && checkAdminOrOwner(team.membership.role);

  if (!isAdmin) {
    return (
      <div className="border-subtle rounded-md border p-5">
        <span className="text-default text-sm">{t("only_owner_change")}</span>
      </div>
    );
  }

  if (!team?.id) return null;

  return (
    <>
      <PresetToggle
        type={InternalNotePresetType.CANCELLATION}
        teamId={team.id}
        titleKey="internal_cancellation_notes_presets"
      />
      <PresetToggle
        type={InternalNotePresetType.REJECTION}
        teamId={team.id}
        titleKey="internal_rejection_notes_presets"
      />
    </>
  );
};

export default InternalNotePresetsView;
