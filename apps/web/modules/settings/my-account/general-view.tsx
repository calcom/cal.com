"use client";

import { formatLocalizedDateTime } from "@calcom/lib/dayjs";
import { useLocale } from "@calcom/i18n/useLocale";
import { localeOptions } from "@calcom/lib/i18n";
import { nameOfDay } from "@calcom/lib/weekday";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { revalidateTravelSchedules } from "@calcom/web/app/cache/travelSchedule";
import TravelScheduleModal from "@components/settings/TravelScheduleModal";
import { Button } from "@coss/ui/components/button";
import { Card, CardFrame, CardFrameFooter, CardPanel } from "@coss/ui/components/card";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
  ComboboxValue,
} from "@coss/ui/components/combobox";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Fieldset, FieldsetLegend } from "@coss/ui/components/fieldset";
import { Form } from "@coss/ui/components/form";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@coss/ui/components/frame";
import { Label } from "@coss/ui/components/label";
import {
  Select,
  SelectButton,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { Separator } from "@coss/ui/components/separator";
import { toastManager } from "@coss/ui/components/toast";
import { CalendarIcon, PlusIcon, SearchIcon, TrashIcon } from "@coss/ui/icons";
import { cn } from "@coss/ui/lib/utils";
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";
import { FieldGrid, FieldGridRow } from "@coss/ui/shared/field-grid";
import { SettingsToggle } from "@coss/ui/shared/settings-toggle";
import { revalidateSettingsGeneral } from "app/(use-page-wrapper)/settings/(settings-layout)/my-account/general/actions";
import { useSession } from "next-auth/react";
import { Fragment, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

export type FormValues = {
  locale: {
    value: string;
    label: string;
  };
  timeZone: string;
  timeFormat: {
    value: number;
    label: string | number;
  };
  weekStart: {
    value: string;
    label: string;
  };
  travelSchedules: {
    id?: number;
    startDate: Date;
    endDate?: Date;
    timeZone: string;
  }[];
};

interface GeneralViewProps {
  user: RouterOutputs["viewer"]["me"]["get"];
  travelSchedules: RouterOutputs["viewer"]["travelSchedules"]["get"];
}

const GeneralView = ({ user, travelSchedules }: GeneralViewProps) => {
  const localeProp = user.locale ?? "en";
  const utils = trpc.useContext();
  const {
    t,
    i18n: { language },
  } = useLocale();
  const { update } = useSession();
  const [isUpdateBtnLoading, setIsUpdateBtnLoading] = useState<boolean>(false);
  const [isTZScheduleOpen, setIsTZScheduleOpen] = useState<boolean>(false);

  const mutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async (res) => {
      await utils.viewer.me.invalidate();
      revalidateSettingsGeneral();
      revalidateTravelSchedules();
      reset(getValues());
      toastManager.add({ title: t("settings_updated_successfully"), type: "success" });
      await update(res);

      if (res.locale) {
        window.calNewLocale = res.locale;
        document.cookie = `calNewLocale=${res.locale}; path=/`;
      }
    },
    onError: () => {
      toastManager.add({ title: t("error_updating_settings"), type: "error" });
    },
    onSettled: async () => {
      await utils.viewer.me.invalidate();
      revalidateSettingsGeneral();
      revalidateTravelSchedules();
      setIsUpdateBtnLoading(false);
    },
  });

  const sortedLocaleOptions = useMemo(
    () => [...localeOptions].sort((a, b) => a.label.localeCompare(b.label)),
    []
  );

  const timeFormatOptions = [
    { value: 12, label: t("12_hour") },
    { value: 24, label: t("24_hour") },
  ];

  const weekStartOptions = [
    { value: "Sunday", label: nameOfDay(localeProp, 0) },
    { value: "Monday", label: nameOfDay(localeProp, 1) },
    { value: "Tuesday", label: nameOfDay(localeProp, 2) },
    { value: "Wednesday", label: nameOfDay(localeProp, 3) },
    { value: "Thursday", label: nameOfDay(localeProp, 4) },
    { value: "Friday", label: nameOfDay(localeProp, 5) },
    { value: "Saturday", label: nameOfDay(localeProp, 6) },
  ];

  const timezoneItems = useMemo(() => {
    const tzNames = Intl.supportedValuesOf("timeZone");
    return tzNames
      .map((tz) => {
        const formatter = new Intl.DateTimeFormat("en", {
          timeZone: tz,
          timeZoneName: "shortOffset",
        });
        const parts = formatter.formatToParts(new Date());
        const offset = parts.find((p) => p.type === "timeZoneName")?.value || "";
        const display = offset === "GMT" ? "GMT+0" : offset;

        const m = offset.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
        const sign = m?.[1] === "-" ? -1 : 1;
        const hrs = Number.parseInt(m?.[2] || "0", 10);
        const mins = Number.parseInt(m?.[3] || "0", 10);
        const total = sign * (hrs * 60 + mins);

        return {
          label: tz.replace(/_/g, " "),
          value: tz,
          offset: display,
          numericOffset: total,
        };
      })
      .sort((a, b) => a.numericOffset - b.numericOffset);
  }, []);

  const formMethods = useForm<FormValues>({
    defaultValues: {
      locale: {
        value: localeProp || "",
        label: localeOptions.find((option) => option.value === localeProp)?.label || "",
      },
      timeZone: user.timeZone || "",
      timeFormat: {
        value: user.timeFormat || 12,
        label: timeFormatOptions.find((option) => option.value === user.timeFormat)?.label || 12,
      },
      weekStart: {
        value: user.weekStart,
        label: weekStartOptions.find((option) => option.value === user.weekStart)?.label || "",
      },
      travelSchedules:
        travelSchedules.map((schedule) => {
          return {
            id: schedule.id,
            startDate: schedule.startDate,
            endDate: schedule.endDate ?? undefined,
            timeZone: schedule.timeZone,
          };
        }) || [],
    },
  });
  const {
    formState: { isDirty, isSubmitting },
    reset,
    getValues,
  } = formMethods;
  const isDisabled = isSubmitting || !isDirty;

  const [isAllowDynamicBookingChecked, setIsAllowDynamicBookingChecked] = useState(
    !!user.allowDynamicBooking
  );
  const [isAllowSEOIndexingChecked, setIsAllowSEOIndexingChecked] = useState(
    user.organizationSettings?.allowSEOIndexing === false
      ? !!user.organizationSettings?.allowSEOIndexing
      : !!user.allowSEOIndexing
  );
  const [isReceiveMonthlyDigestEmailChecked, setIsReceiveMonthlyDigestEmailChecked] = useState(
    !!user.receiveMonthlyDigestEmail
  );
  const [isRequireBookerEmailVerificationChecked, setIsRequireBookerEmailVerificationChecked] = useState(
    !!user.requiresBookerEmailVerification
  );

  const watchedTzSchedules = formMethods.watch("travelSchedules");

  return (
    <>
      <AppHeader>
        <AppHeaderContent title={t("general")}>
          <AppHeaderDescription>{t("general_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>

      <div className="flex flex-col gap-4">
        <Form
          className="contents"
          onSubmit={formMethods.handleSubmit(async (values) => {
            setIsUpdateBtnLoading(true);
            mutation.mutate({
              ...values,
              locale: values.locale.value,
              timeFormat: values.timeFormat.value,
              weekStart: values.weekStart.value,
            });
          })}>
          <CardFrame>
            <Card>
              <CardPanel>
                <FieldGrid>
                  <Controller
                    name="locale"
                    control={formMethods.control}
                    render={({ field: { name, value, onChange } }) => (
                      <Field name={name}>
                        <FieldLabel>{t("language")}</FieldLabel>
                        <Combobox
                          autoHighlight
                          value={value}
                          onValueChange={(val) => {
                            if (val) onChange(val);
                          }}
                          items={sortedLocaleOptions}>
                          <ComboboxTrigger
                            render={<SelectButton />}
                            className="capitalize"
                            data-testid="locale-select">
                            <ComboboxValue />
                          </ComboboxTrigger>
                          <ComboboxPopup aria-label={t("language")}>
                            <div className="border-b p-2">
                              <ComboboxInput
                                className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
                                placeholder={t("language")}
                                showTrigger={false}
                                startAddon={<SearchIcon aria-hidden="true" />}
                              />
                            </div>
                            <ComboboxEmpty>{t("no_options_available")}</ComboboxEmpty>
                            <ComboboxList>
                              {(item) => (
                                <ComboboxItem
                                  key={item.value}
                                  value={item}
                                  className="capitalize"
                                  data-testid={`select-option-${item.value}`}>
                                  {item.label}
                                </ComboboxItem>
                              )}
                            </ComboboxList>
                          </ComboboxPopup>
                        </Combobox>
                      </Field>
                    )}
                  />

                  <FieldGridRow>
                    <Controller
                      name="timeZone"
                      control={formMethods.control}
                      render={({ field: { value } }) => {
                        const selectedItem = timezoneItems.find((tz) => tz.value === value) ?? null;
                        return (
                          <Fieldset className="max-w-none gap-2">
                            <Label render={<FieldsetLegend />}>{t("timezone")}</Label>
                            <FieldGrid className="gap-6">
                              <Field className="contents">
                                <Combobox
                                  autoHighlight
                                  value={selectedItem}
                                  onValueChange={(val) => {
                                    if (val)
                                      formMethods.setValue("timeZone", val.value, {
                                        shouldDirty: true,
                                      });
                                  }}
                                  items={timezoneItems}>
                                  <ComboboxTrigger render={<SelectButton />}>
                                    <ComboboxValue />
                                  </ComboboxTrigger>
                                  <ComboboxPopup aria-label={t("timezone")}>
                                    <div className="border-b p-2">
                                      <ComboboxInput
                                        className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
                                        placeholder={t("timezone")}
                                        showTrigger={false}
                                        startAddon={<SearchIcon aria-hidden="true" />}
                                      />
                                    </div>
                                    <ComboboxEmpty>{t("no_options_available")}</ComboboxEmpty>
                                    <ComboboxList>
                                      {(item) => (
                                        <ComboboxItem
                                          key={item.value}
                                          value={item}
                                          className="*:[div]:flex *:[div]:justify-between *:[div]:items-center *:[div]:gap-1">
                                          <span>{item.value.replace(/_/g, " ")}</span>
                                          <span className="font-medium text-muted-foreground/72 text-sm sm:text-xs">
                                            {item.offset}
                                          </span>
                                        </ComboboxItem>
                                      )}
                                    </ComboboxList>
                                  </ComboboxPopup>
                                </Combobox>
                              </Field>
                              {!watchedTzSchedules.length && (
                                <Button
                                  className="w-fit"
                                  variant="outline"
                                  onClick={() => setIsTZScheduleOpen(true)}>
                                  <CalendarIcon aria-hidden="true" />
                                  {t("schedule_timezone_change")}
                                </Button>
                              )}
                            </FieldGrid>
                          </Fieldset>
                        );
                      }}
                    />
                  </FieldGridRow>

                  {watchedTzSchedules.length > 0 && (
                    <FieldGridRow>
                      <Frame className="-mx-1">
                        <FrameHeader className="flex-row items-center justify-between">
                          <FrameTitle>{t("travel_schedule")}</FrameTitle>
                          <Button
                            className="-my-1"
                            variant="outline"
                            onClick={() => setIsTZScheduleOpen(true)}>
                            <PlusIcon aria-hidden="true" />
                            {t("add")}
                          </Button>
                        </FrameHeader>
                        <FramePanel className="bg-card p-0">
                          {watchedTzSchedules.map((schedule, index) => (
                            <Fragment key={index}>
                              <div className="flex items-center justify-between gap-2 p-5">
                                <div>
                                  <div className="font-semibold text-sm">{`${formatLocalizedDateTime(
                                    schedule.startDate,
                                    { day: "numeric", month: "long" },
                                    language
                                  )}${schedule.endDate
                                    ? ` - ${formatLocalizedDateTime(
                                      schedule.endDate,
                                      { day: "numeric", month: "long" },
                                      language
                                    )}`
                                    : ""
                                    }`}</div>
                                  <div className="text-muted-foreground text-sm">
                                    {schedule.timeZone.replace(/_/g, " ")}
                                  </div>
                                </div>
                                <Button
                                  variant="destructive-outline"
                                  size="icon"
                                  onClick={() => {
                                    const updatedSchedules = watchedTzSchedules.filter(
                                      (_s, filterIndex) => filterIndex !== index
                                    );
                                    formMethods.setValue("travelSchedules", updatedSchedules, {
                                      shouldDirty: true,
                                    });
                                  }}
                                  aria-label={t("delete")}>
                                  <TrashIcon aria-hidden="true" />
                                </Button>
                              </div>
                              {index < watchedTzSchedules.length - 1 && <Separator />}
                            </Fragment>
                          ))}
                        </FramePanel>
                      </Frame>
                    </FieldGridRow>
                  )}

                  <Controller
                    name="timeFormat"
                    control={formMethods.control}
                    render={({ field: { name, value, onBlur, onChange } }) => (
                      <Field name={name}>
                        <FieldLabel>{t("time_format")}</FieldLabel>
                        <Select
                          aria-label={t("time_format")}
                          items={timeFormatOptions}
                          value={value}
                          onValueChange={(val) => {
                            if (val) onChange(val);
                          }}
                          onOpenChange={(open) => {
                            if (!open) onBlur();
                          }}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectPopup>
                            {timeFormatOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectPopup>
                        </Select>
                        <FieldDescription>{t("timeformat_profile_hint")}</FieldDescription>
                      </Field>
                    )}
                  />

                  <Controller
                    name="weekStart"
                    control={formMethods.control}
                    render={({ field: { name, value, onBlur, onChange } }) => (
                      <Field name={name}>
                        <FieldLabel>{t("start_of_week")}</FieldLabel>
                        <Select
                          aria-label={t("start_of_week")}
                          items={weekStartOptions}
                          value={value}
                          onValueChange={(val) => {
                            if (val) onChange(val);
                          }}
                          onOpenChange={(open) => {
                            if (!open) onBlur();
                          }}>
                          <SelectTrigger className="capitalize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectPopup>
                            {weekStartOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt} className="capitalize">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectPopup>
                        </Select>
                      </Field>
                    )}
                  />
                </FieldGrid>
              </CardPanel>
            </Card>
            <CardFrameFooter className="flex justify-end">
              <Button
                loading={isUpdateBtnLoading}
                disabled={isDisabled}
                type="submit"
                data-testid="general-submit-button">
                {t("update")}
              </Button>
            </CardFrameFooter>
          </CardFrame>
        </Form>

        <SettingsToggle
          title={t("dynamic_booking")}
          description={t("allow_dynamic_booking")}
          disabled={mutation.isPending}
          checked={isAllowDynamicBookingChecked}
          onCheckedChange={(checked) => {
            setIsAllowDynamicBookingChecked(checked);
            mutation.mutate({ allowDynamicBooking: checked });
          }}
        />

        <SettingsToggle
          title={t("seo_indexing")}
          description={t("allow_seo_indexing")}
          disabled={mutation.isPending || user.organizationSettings?.allowSEOIndexing === false}
          checked={isAllowSEOIndexingChecked}
          onCheckedChange={(checked) => {
            setIsAllowSEOIndexingChecked(checked);
            mutation.mutate({ allowSEOIndexing: checked });
          }}
        />

        <SettingsToggle
          title={t("monthly_digest_email")}
          description={t("monthly_digest_email_for_teams")}
          disabled={mutation.isPending}
          checked={isReceiveMonthlyDigestEmailChecked}
          onCheckedChange={(checked) => {
            setIsReceiveMonthlyDigestEmailChecked(checked);
            mutation.mutate({ receiveMonthlyDigestEmail: checked });
          }}
        />

        <SettingsToggle
          title={t("require_booker_email_verification")}
          description={t("require_booker_email_verification_description")}
          disabled={mutation.isPending}
          checked={isRequireBookerEmailVerificationChecked}
          onCheckedChange={(checked) => {
            setIsRequireBookerEmailVerificationChecked(checked);
            mutation.mutate({ requiresBookerEmailVerification: checked });
          }}
        />

        <TravelScheduleModal
          open={isTZScheduleOpen}
          onOpenChange={setIsTZScheduleOpen}
          setValue={formMethods.setValue}
          existingSchedules={formMethods.getValues("travelSchedules") ?? []}
        />
      </div>
    </>
  );
};

export default GeneralView;
