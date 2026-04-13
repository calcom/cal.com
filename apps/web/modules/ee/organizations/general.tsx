"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { nameOfDay } from "@calcom/lib/weekday";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
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
import { Form } from "@coss/ui/components/form";
import { Select, SelectButton, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@coss/ui/components/select";
import { toastManager } from "@coss/ui/components/toast";
import { SearchIcon } from "@coss/ui/icons";
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";
import { FieldGrid } from "@coss/ui/shared/field-grid";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import LicenseRequired from "~/ee/common/components/LicenseRequired";
import { DisableAutofillOnBookingPageSwitch } from "~/ee/organizations/components/DisableAutofillOnBookingPageSwitch";
import { DisablePhoneOnlySMSNotificationsSwitch } from "~/ee/organizations/components/DisablePhoneOnlySMSNotificationsSwitch";
import { LockEventTypeSwitch } from "~/ee/organizations/components/LockEventTypeSwitch";
import { NoSlotsNotificationSwitch } from "~/ee/organizations/components/NoSlotsNotificationSwitch";
import { SkeletonLoader } from "~/ee/organizations/general-skeleton";

interface GeneralViewProps {
  currentOrg: RouterOutputs["viewer"]["organizations"]["listCurrent"];
  localeProp: string;

  permissions: {
    canRead: boolean;
    canEdit: boolean;
  };
}

const OrgGeneralView = ({
  permissions,
}: {
  permissions: {
    canRead: boolean;
    canEdit: boolean;
  };
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const session = useSession();

  const {
    data: currentOrg,
    isPending,
    error,
  } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {});

  useEffect(
    function refactorMeWithoutEffect() {
      if (error) {
        router.replace("/enterprise");
      }
    },
    [error]
  );

  if (isPending) return <SkeletonLoader />;
  if (!currentOrg) {
    return null;
  }

  return (
    <LicenseRequired>
      <AppHeader>
        <AppHeaderContent title={t("general")}>
          <AppHeaderDescription>{t("general_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>

      <div className="flex flex-col gap-4">
        <GeneralView
          currentOrg={currentOrg}
          localeProp={session.data?.user.locale ?? "en"}
          permissions={permissions}
        />

        {permissions.canEdit && (
          <>
            <LockEventTypeSwitch currentOrg={currentOrg} />
            <NoSlotsNotificationSwitch currentOrg={currentOrg} />
            <DisablePhoneOnlySMSNotificationsSwitch currentOrg={currentOrg} />
            <DisableAutofillOnBookingPageSwitch currentOrg={currentOrg} />
          </>
        )}
      </div>
    </LicenseRequired>
  );
};

const GeneralView = ({ currentOrg, permissions, localeProp }: GeneralViewProps) => {
  const { t } = useLocale();

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

  const mutation = trpc.viewer.organizations.update.useMutation({
    onSuccess: async () => {
      reset(getValues());
      toastManager.add({ title: t("settings_updated_successfully"), type: "success" });
    },
    onError: () => {
      toastManager.add({ title: t("error_updating_settings"), type: "error" });
    },
  });

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

  const formMethods = useForm({
    defaultValues: {
      timeZone: currentOrg.timeZone || "",
      timeFormat: {
        value: currentOrg.timeFormat || 12,
        label:
          timeFormatOptions.find((option) => option.value === currentOrg.timeFormat)?.label ??
          t("12_hour"),
      },
      weekStart: {
        value: currentOrg.weekStart,
        label:
          weekStartOptions.find((option) => option.value === currentOrg.weekStart)?.label ||
          nameOfDay(localeProp, 0),
      },
    },
  });
  const {
    formState: { isDirty, isSubmitting },
    reset,
    getValues,
  } = formMethods;
  const isDisabled = isSubmitting || !isDirty || !permissions.canEdit;
  return (
    <Form
      className="contents"
      onSubmit={formMethods.handleSubmit((values) => {
        mutation.mutate({
          ...values,
          timeFormat: values.timeFormat.value,
          weekStart: values.weekStart.value,
        });
      })}>
      <CardFrame>
        <Card>
          <CardPanel>
            <FieldGrid>
              <Controller
                name="timeZone"
                control={formMethods.control}
                render={({ field: { name, value } }) => {
                  const selectedItem = timezoneItems.find((tz) => tz.value === value) ?? null;
                  return (
                    <Field name={name}>
                      <FieldLabel>{t("timezone")}</FieldLabel>
                      <Combobox
                        autoHighlight
                        value={selectedItem}
                        onValueChange={(val) => {
                          if (val) formMethods.setValue("timeZone", val.value, { shouldDirty: true });
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
                                <span className="text-muted-foreground/72 text-sm font-medium sm:text-xs">
                                  {item.offset}
                                </span>
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxPopup>
                      </Combobox>
                    </Field>
                  );
                }}
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {weekStartOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </Field>
                )}
              />
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
            </FieldGrid>
          </CardPanel>
        </Card>
        {permissions?.canEdit && (
          <CardFrameFooter className="flex justify-end">
            <Button disabled={isDisabled} type="submit">
              {t("update")}
            </Button>
          </CardFrameFooter>
        )}
      </CardFrame>
    </Form>
  );
};

export default OrgGeneralView;
