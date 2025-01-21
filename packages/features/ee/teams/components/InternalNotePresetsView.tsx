"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useMemo } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button, Form, SettingsToggle, showToast, Icon } from "@calcom/ui";

interface ProfileViewProps {
  team: RouterOutputs["viewer"]["teams"]["get"];
}

const InternalNotePresetsView = ({ team }: ProfileViewProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { data: _loadedPresets, isLoading } = trpc.viewer.teams.getInternalNotesPresets.useQuery({
    teamId: team?.id as number,
  });

  const loadedPresets = useMemo(() => {
    return _loadedPresets ?? [];
  }, [_loadedPresets]);

  const hasExistingPresets = loadedPresets.length > 0;

  type FormValues = {
    presets: { id?: number; name: string }[];
  };

  const form = useForm<FormValues>({
    values: {
      presets: loadedPresets,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "presets",
  });

  const addNewPreset = () => {
    append({ id: -1, name: "" });
  };

  const updatePresetsMutation = trpc.viewer.teams.updateInternalNotesPresets.useMutation({
    onSuccess: () => {
      showToast(t("internal_note_presets_updated_successfully"), "success");
      utils.viewer.teams.getInternalNotesPresets.invalidate();
    },
    onError: (error) => {
      showToast(error.message || t("something_went_wrong"), "error");
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!team?.id) return;

    updatePresetsMutation.mutate({
      teamId: team.id,
      presets: data.presets,
    });
  };

  const [animateRef] = useAutoAnimate<HTMLDivElement>();

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

  return (
    <>
      {isAdmin ? (
        <Form form={form} handleSubmit={(e) => onSubmit(e)}>
          <Controller
            name="presets"
            render={({ field: { value } }) => {
              const isChecked = hasExistingPresets || (value && value.length > 0);
              return (
                <SettingsToggle
                  toggleSwitchAtTheEnd={true}
                  labelClassName="text-sm"
                  title={t("internal_note_presets")}
                  description={t("internal_note_presets_description")}
                  checked={isChecked}
                  childrenClassName="lg:ml-0"
                  onCheckedChange={async (active) => {
                    if (active && !value?.length) {
                      append({ id: -1, name: "" });
                    } else {
                      replace([]);
                      if (!active && team?.id && hasExistingPresets) {
                        updatePresetsMutation.mutate({
                          teamId: team.id,
                          presets: [],
                        });
                      }
                    }
                  }}
                  switchContainerClassName={classNames(
                    "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
                    isChecked && "rounded-b-none"
                  )}>
                  <div className="border-subtle border border-y-0 p-6">
                    <div className="flex flex-col space-y-4" ref={animateRef}>
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center space-x-2">
                          <Controller
                            name={`presets.${index}.name`}
                            control={form.control}
                            render={({ field }) => (
                              <input
                                type="text"
                                {...field}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-neutral-900 focus:ring-neutral-900 sm:text-sm"
                              />
                            )}
                          />
                          <Button
                            type="button"
                            color="destructive"
                            variant="icon"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}>
                            <Icon name="trash" className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      color="minimal"
                      StartIcon="plus"
                      onClick={addNewPreset}
                      className="mt-4">
                      {t("add_preset")}
                    </Button>
                  </div>
                  <SectionBottomActions align="end">
                    <Button type="submit" color="primary" loading={updatePresetsMutation.isPending}>
                      {t("update")}
                    </Button>
                  </SectionBottomActions>
                </SettingsToggle>
              );
            }}
          />
        </Form>
      ) : (
        <div className="border-subtle rounded-md border p-5">
          <span className="text-default text-sm">{t("only_owner_change")}</span>
        </div>
      )}
    </>
  );
};

export default InternalNotePresetsView;
