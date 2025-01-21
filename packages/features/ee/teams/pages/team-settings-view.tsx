"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";

import { AppearanceSkeletonLoader } from "@calcom/features/ee/components/CommonSkeletonLoaders";
import { IntervalLimitsManager } from "@calcom/features/eventtypes/components/tabs/limits/EventLimitsTab";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { classNames, validateIntervalLimitOrder } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { IntervalLimit } from "@calcom/types/Calendar";
import { Button, CheckboxField, Form, SettingsToggle, showToast, Icon } from "@calcom/ui";

type ProfileViewProps = { team: RouterOutputs["viewer"]["teams"]["get"] };

const BookingLimitsView = ({ team }: ProfileViewProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const form = useForm<{ bookingLimits?: IntervalLimit; includeManagedEventsInLimits: boolean }>({
    defaultValues: {
      bookingLimits: team?.bookingLimits || undefined,
      includeManagedEventsInLimits: team?.includeManagedEventsInLimits ?? false,
    },
  });

  const {
    formState: { isSubmitting, isDirty },
    reset,
  } = form;

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess(res) {
      await utils.viewer.teams.get.invalidate();
      if (res) {
        reset({
          bookingLimits: res.bookingLimits,
          includeManagedEventsInLimits: res.includeManagedEventsInLimits,
        });
      }
      showToast(t("booking_limits_updated_successfully"), "success");
    },
  });

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

  return (
    <>
      {isAdmin ? (
        <>
          <Form
            form={form}
            handleSubmit={(values) => {
              if (values.bookingLimits) {
                const isValid = validateIntervalLimitOrder(values.bookingLimits);
                if (!isValid) {
                  reset();
                  throw new Error(t("event_setup_booking_limits_error"));
                }
              }
              mutation.mutate({ ...values, id: team.id });
            }}>
            <Controller
              name="bookingLimits"
              render={({ field: { value } }) => {
                const isChecked = Object.keys(value ?? {}).length > 0;
                return (
                  <SettingsToggle
                    toggleSwitchAtTheEnd={true}
                    labelClassName="text-sm"
                    title={t("limit_booking_frequency")}
                    description={t("limit_team_booking_frequency_description")}
                    checked={isChecked}
                    onCheckedChange={(active) => {
                      if (active) {
                        form.setValue("bookingLimits", {
                          PER_DAY: 1,
                        });
                      } else {
                        form.setValue("bookingLimits", {});
                        form.setValue("includeManagedEventsInLimits", false);
                      }
                      const bookingLimits = form.getValues("bookingLimits");
                      const includeManagedEventsInLimits = form.getValues("includeManagedEventsInLimits");

                      mutation.mutate({ bookingLimits, includeManagedEventsInLimits, id: team.id });
                    }}
                    switchContainerClassName={classNames(
                      "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
                      isChecked && "rounded-b-none"
                    )}
                    childrenClassName="lg:ml-0">
                    <div className="border-subtle border border-y-0 p-6">
                      <Controller
                        name="includeManagedEventsInLimits"
                        render={({ field: { value, onChange } }) => (
                          <CheckboxField
                            description={t("count_managed_to_limit")}
                            descriptionAsLabel
                            onChange={(e) => onChange(e)}
                            checked={value}
                          />
                        )}
                      />

                      <div className="pt-6">
                        <IntervalLimitsManager propertyName="bookingLimits" defaultLimit={1} step={1} />
                      </div>
                    </div>
                    <SectionBottomActions className="mb-6" align="end">
                      <Button disabled={isSubmitting || !isDirty} type="submit" color="primary">
                        {t("update")}
                      </Button>
                    </SectionBottomActions>
                  </SettingsToggle>
                );
              }}
            />
          </Form>
        </>
      ) : (
        <div className="border-subtle rounded-md border p-5">
          <span className="text-default text-sm">{t("only_owner_change")}</span>
        </div>
      )}
    </>
  );
};

const InternalNotePresetsView = ({ team }: ProfileViewProps) => {
  const { t } = useLocale();
  const { data: _loadedPresets, isLoading } = trpc.viewer.teams.getInternalNotesPresets.useQuery({
    teamId: team?.id as number,
  });

  const loadedPresets = useMemo(() => {
    return _loadedPresets ?? [];
  }, [_loadedPresets]);

  type FormValues = {
    presets: { id?: number; name: string }[];
  };

  const form = useForm<FormValues>({
    defaultValues: {
      presets: loadedPresets ?? [{ id: -1, name: "" }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "presets",
  });

  const addNewPreset = () => {
    append({ id: -1, name: "" });
  };

  const onSubmit = async (data: FormValues) => {
    // TODO: Implement save functionality
    showToast("Changes saved", "success");
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
              const isChecked = value && value.length > 0;
              return (
                <SettingsToggle
                  toggleSwitchAtTheEnd={true}
                  labelClassName="text-sm"
                  title={t("internal_note_presets")}
                  description={t("internal_note_presets_description")}
                  checked={isChecked}
                  childrenClassName="lg:ml-0"
                  onCheckedChange={(active) => {
                    if (active) {
                      append({ id: -1, name: "" });
                    } else {
                      replace([]);
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
                                placeholder={t("note_preset_name")}
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
                    <Button type="submit" color="primary">
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

const TeamSettingsViewWrapper = () => {
  const router = useRouter();
  const params = useParamsWithFallback();

  const {
    data: team,
    isPending,
    error,
  } = trpc.viewer.teams.get.useQuery(
    { teamId: Number(params.id) },
    {
      enabled: !!Number(params.id),
    }
  );

  useEffect(
    function refactorMeWithoutEffect() {
      if (error) {
        router.replace("/teams");
      }
    },
    [error]
  );

  if (isPending) return <AppearanceSkeletonLoader />;

  if (!team) return null;

  return (
    <>
      <BookingLimitsView team={team} />
      <InternalNotePresetsView team={team} />
    </>
  );
};

export default TeamSettingsViewWrapper;
