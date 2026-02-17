import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import classNames from "@calcom/ui/classNames";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import {
  Checkbox,
  DateRangePicker,
  Input,
  Label,
  Select,
  Switch,
  TextArea,
} from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useHasTeamPlan } from "@calcom/web/modules/billing/hooks/useHasPaidPlan";

import { UpgradeTeamsBadgeWebWrapper as UpgradeTeamsBadge } from "~/billing/components/UpgradeTeamsBadgeWebWrapper";
import { OutOfOfficeTab } from "~/settings/outOfOffice/OutOfOfficeToggleGroup";

export type { BookingRedirectForm } from "~/settings/outOfOffice/types";
import type { BookingRedirectForm } from "~/settings/outOfOffice/types";

type Option = { value: number; label: string; isCustom?: boolean };

export const CreateOrEditOutOfOfficeEntryModal = ({
  openModal,
  closeModal,
  currentlyEditingOutOfOfficeEntry,
}: {
  openModal: boolean;
  closeModal: () => void;
  currentlyEditingOutOfOfficeEntry: BookingRedirectForm | null;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const me = useMeQuery();

  const searchParams = useCompatSearchParams();
  const oooType = searchParams?.get("type") ?? OutOfOfficeTab.MINE;

  const [searchMember, setSearchMember] = useState("");
  const debouncedSearchMember = useDebounce(searchMember, 500);
  const oooForMembers = trpc.viewer.teams.legacyListMembers.useInfiniteQuery(
    { limit: 10, searchText: debouncedSearchMember, adminOrOwnedTeamsOnly: true },
    {
      enabled: oooType === OutOfOfficeTab.TEAM,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );
  const oooMemberListOptions: {
    value: number;
    label: string;
    avatarUrl: string | null;
  }[] = currentlyEditingOutOfOfficeEntry
    ? [
        {
          value: currentlyEditingOutOfOfficeEntry.forUserId || -1,
          label: currentlyEditingOutOfOfficeEntry.forUserName || "",
          avatarUrl: currentlyEditingOutOfOfficeEntry.forUserAvatar || "",
        },
      ]
    : oooForMembers?.data?.pages
        .flatMap((page) => page.members)
        ?.filter((member) => me?.data?.id !== member.id)
        .map((member) => ({
          value: member.id,
          label: member.name || member.username || "",
          avatarUrl: member.avatarUrl,
        })) || [];
  const [searchRedirectMember, setSearchRedirectMember] = useState("");
  const debouncedSearchRedirect = useDebounce(searchRedirectMember, 500);
  const redirectMembers = trpc.viewer.teams.legacyListMembers.useInfiniteQuery(
    {
      limit: 10,
      searchText: debouncedSearchRedirect,
      adminOrOwnedTeamsOnly: oooType === OutOfOfficeTab.TEAM,
    },
    {
      enabled: true,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );
  const redirectToMemberListOptions: {
    value: number;
    label: string;
    avatarUrl: string | null;
  }[] =
    redirectMembers?.data?.pages
      .flatMap((page) => page.members)
      ?.filter((member) =>
        oooType === OutOfOfficeTab.MINE ? me?.data?.id !== member.id : oooType === OutOfOfficeTab.TEAM
      )
      .map((member) => ({
        value: member.id,
        label: member.name || member.username || "",
        avatarUrl: member.avatarUrl,
      })) || [];

  const { data: outOfOfficeReasonList, isPending: isReasonListPending } =
    trpc.viewer.ooo.outOfOfficeReasonList.useQuery();

  const [showCustomReasonForm, setShowCustomReasonForm] = useState<boolean>(false);
  const [customEmoji, setCustomEmoji] = useState<string>("💼");
  const [customReasonText, setCustomReasonText] = useState<string>("");

  const reasonList: Option[] = (outOfOfficeReasonList || []).map((reason) => ({
    label: `${reason.emoji} ${reason.userId === null ? t(reason.reason) : reason.reason}`,
    value: reason.id,
    isCustom: reason.userId !== null,
  }));

  const createCustomReason = trpc.viewer.ooo.outOfOfficeCreateReason.useMutation({
    onSuccess: (data) => {
      showToast(t("custom_reason_created"), "success");
      setShowCustomReasonForm(false);
      setCustomReasonText("");
      setCustomEmoji("💼");
      setValue("reasonId", data.id);
      utils.viewer.ooo.outOfOfficeReasonList.invalidate();
    },
    onError: (error) => {
      showToast(t(error.message), "error");
    },
  });

  const deleteCustomReason = trpc.viewer.ooo.outOfOfficeDeleteReason.useMutation({
    onSuccess: (_data, variables) => {
      showToast(t("custom_reason_deleted"), "success");

      const currentReasonId = getValues("reasonId");

      if (currentReasonId === variables.id) {
      const fallbackReason = reasonList.find((r) => !r.isCustom);
        setValue("reasonId", fallbackReason?.value ?? 1);
      }
    
    utils.viewer.ooo.outOfOfficeReasonList.invalidate();
    },
    onError: (error) => {
      showToast(t(error.message), "error");
    },
  });

  const [profileRedirect, setProfileRedirect] = useState(!!currentlyEditingOutOfOfficeEntry?.toTeamUserId);

  useEffect(() => {
    if (!openModal) {
      setShowCustomReasonForm(false);
      setCustomReasonText("");
      setCustomEmoji("💼");
    }
  }, [openModal]);

  const { hasTeamPlan } = useHasTeamPlan();

  const {
    handleSubmit,
    setValue,
    control,
    register,
    watch,
    formState: { isSubmitting },
    getValues,
  } = useForm<BookingRedirectForm>({
    defaultValues: currentlyEditingOutOfOfficeEntry
      ? currentlyEditingOutOfOfficeEntry
      : {
          dateRange: {
            startDate: dayjs().startOf("d").toDate(),
            endDate: dayjs().startOf("d").add(2, "d").toDate(),
          },
          startDateOffset: dayjs().utcOffset(),
          endDateOffset: dayjs().utcOffset(),
          toTeamUserId: null,
          reasonId: 1,
          forUserId: null,
          showNotePublicly: false,
        },
  });

  const watchedDateRange = watch("dateRange");
  const watchedNotes = watch("notes");
  const hasValidNotes = Boolean(watchedNotes?.trim());
  // below pattern covers common emoji ranges
  const emojiPattern = /^(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])+$/;

  // Fetch user's holiday settings to show warning if OOO dates overlap with holidays
  const { data: holidaySettings } = trpc.viewer.holidays.getUserSettings.useQuery({});

  // Check if selected dates overlap with any enabled holidays
  const overlappingHolidays = useMemo(() => {
    if (!holidaySettings?.countryCode || !watchedDateRange?.startDate || !watchedDateRange?.endDate) {
      return [];
    }

    // Filter holidays that are enabled and fall within the date range
    const startStr = dayjs(watchedDateRange.startDate).format("YYYY-MM-DD");
    const endStr = dayjs(watchedDateRange.endDate).format("YYYY-MM-DD");

    return (holidaySettings.holidays || [])
      .filter((h) => h.enabled && h.date >= startStr && h.date <= endStr)
      .map((h) => ({ date: h.date, holiday: { id: h.id, name: h.name } }));
  }, [holidaySettings, watchedDateRange]);

  const createOrEditOutOfOfficeEntry = trpc.viewer.ooo.outOfOfficeCreateOrUpdate.useMutation({
    onSuccess: () => {
      showToast(
        currentlyEditingOutOfOfficeEntry
          ? t("success_edited_entry_out_of_office")
          : t("success_entry_created"),
        "success"
      );
      utils.viewer.ooo.outOfOfficeEntriesList.invalidate();
      closeModal();
    },
    onError: (error) => {
      showToast(t(error.message), "error");
    },
  });

  return (
    <Dialog
      open={openModal}
      onOpenChange={(open) => {
        if (!open) {
          closeModal();
        }
      }}>
      <DialogContent
        enableOverflow
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}>
        <form
          id="create-or-edit-ooo-form"
          onSubmit={handleSubmit((data) => {
            if (!data.dateRange.endDate) {
              showToast(t("end_date_not_selected"), "error");
            } else {
              createOrEditOutOfOfficeEntry.mutate({
                ...data,
                startDateOffset: -1 * data.dateRange.startDate.getTimezoneOffset(),
                endDateOffset: -1 * data.dateRange.endDate.getTimezoneOffset(),
              });
            }
          })}>
          <div className="h-full px-1">
            <DialogHeader
              title={
                currentlyEditingOutOfOfficeEntry
                  ? t("edit_an_out_of_office")
                  : oooType === "team"
                    ? t("create_ooo_dialog_team_title")
                    : t("create_an_out_of_office")
              }
              subtitle={
                oooType === "team"
                  ? currentlyEditingOutOfOfficeEntry
                    ? t("edit_ooo_dialog_team_subtitle")
                    : t("create_ooo_dialog_team_subtitle")
                  : undefined
              }
            />

            {/* In case of Team, Select Member for whom OOO is created */}
            {oooType === OutOfOfficeTab.TEAM && (
              <div className="mb-4">
                <Label className="text-emphasis mt-6">{t("select_team_member")}</Label>
                <Controller
                  control={control}
                  name="forUserId"
                  render={({ field: { onChange, value } }) => (
                    <Select
                      className="mt-2"
                      data-testid="ooofor_username_select"
                      isSearchable={true}
                      isDisabled={!!currentlyEditingOutOfOfficeEntry}
                      menuPlacement="bottom"
                      value={oooMemberListOptions.find((member) => member.value === value)}
                      placeholder={t("search")}
                      options={oooMemberListOptions}
                      onInputChange={(newValue) => setSearchMember(newValue)}
                      onChange={(selectedOption) => {
                        if (selectedOption?.value) {
                          onChange(selectedOption.value);
                        }
                      }}
                      onMenuScrollToBottom={() => {
                        if (oooForMembers.hasNextPage && !oooForMembers.isFetchingNextPage) {
                          oooForMembers.fetchNextPage();
                        }
                      }}
                      isLoading={oooForMembers.isFetchingNextPage}
                    />
                  )}
                />
              </div>
            )}

            <div>
              <p className="text-emphasis mb-1 block text-sm font-medium capitalize">{t("dates")}</p>
              <div>
                <Controller
                  name="dateRange"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <DateRangePicker
                      minDate={null}
                      dates={{ startDate: value.startDate, endDate: value.endDate }}
                      onDatesChange={(values) => {
                        onChange(values);
                      }}
                      strictlyBottom={true}
                      allowPastDates={true}
                    />
                  )}
                />
              </div>

              {/* Holiday overlap warning */}
              {overlappingHolidays.length > 0 && (
                <Alert
                  className="mt-2"
                  severity="info"
                  title={t("holiday_overlap_info")}
                  message={
                    overlappingHolidays.length === 1
                      ? t("holiday_overlap_message_single", {
                          holiday: overlappingHolidays[0].holiday.name,
                          date: dayjs(overlappingHolidays[0].date).format("D MMM"),
                        })
                      : t("holiday_overlap_message_multiple", {
                          count: overlappingHolidays.length,
                          holidays: overlappingHolidays
                            .slice(0, 3)
                            .map((h) => h.holiday.name)
                            .join(", "),
                        })
                  }
                />
              )}
            </div>

            {/* Reason Select */}
            <div className="mt-4 w-full">
              <div className="">
                <p className="text-emphasis block text-sm font-medium">{t("reason")}</p>
                <Controller
                  control={control}
                  name="reasonId"
                  render={({ field: { onChange, value } }) => (
                    <Select<Option>
                      className="mb-0 mt-1 text-white"
                      name="reason"
                      data-testid="reason_select"
                      menuPlacement="bottom"
                      value={reasonList.find((reason) => reason.value === value)}
                      placeholder={t("ooo_select_reason")}
                      options={[
                        ...reasonList,
                        { value: -1, label: `+ ${t("create_custom_reason")}`, isCustom: false },
                      ]}
                      onChange={(selectedOption) => {
                        if (selectedOption?.value === -1) {
                          setShowCustomReasonForm(true);
                        } else if (selectedOption?.value) {
                          onChange(selectedOption.value);
                        }
                      }}
                    />
                  )}
                />
                {showCustomReasonForm && (
                  <div className=" mt-2 rounded-lg p-3">
                    <p className="text-emphasis mb-2 text-sm font-medium">{t("create_custom_reason")}</p>
                    <div className="flex gap-2">
                      <div className="w-16">
                        <Label className="text-emphasis text-xs">{t("emoji")}</Label>
                        <Input
                          value={customEmoji}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (!emojiPattern.test(value)) return;
                            setCustomEmoji(value);
                          }}
                          maxLength={10}
                          minLength={1}
                          className="mt-1 text-center"
                          placeholder="💼"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-emphasis text-xs">{t("reason_text")}</Label>
                        <Input
                          value={customReasonText}
                          onChange={(e) => setCustomReasonText(e.target.value)}
                          maxLength={50}
                          className="mt-1"
                          placeholder={t("custom_reason_placeholder")}
                        />
                        <p className="text-xs mt-2 text-muted">{t("custom_reason_limit_note")}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button
                        type="button"
                        color="minimal"
                        size="sm"
                        onClick={() => {
                          setShowCustomReasonForm(false);
                          setCustomReasonText("");
                          setCustomEmoji("💼");
                        }}>
                        {t("cancel")}
                      </Button>
                      <Button
                        type="button"
                        color="primary"
                        size="sm"
                        disabled={
                          !customEmoji.trim() || !customReasonText.trim() || createCustomReason.isPending
                        }
                        onClick={() => {
                          createCustomReason.mutate({
                            emoji: customEmoji.trim(),
                            reason: customReasonText.trim(),
                          });
                        }}>
                        {createCustomReason.isPending ? t("saving") : t("save")}
                      </Button>
                    </div>
                  </div>
                )}

                {reasonList.some((r) => r.isCustom) && (
                  <div className="mt-2">
                    <p className="text-emphasis text-sm font-medium">{t("my_custom_reasons")}</p>
                    <div className="space-y-1">
                      {reasonList
                        .filter((r) => r.isCustom)
                        .map((reason) => (
                          <div
                            key={reason.value}
                            className="flex items-center justify-between rounded bg-muted px-2 py-1">
                            <span className="text-sm">{reason.label}</span>
                            <Button
                              type="button"
                              color="destructive"
                              size="sm"
                              StartIcon="trash"
                              onClick={() => {
                                deleteCustomReason.mutate({ id: reason.value });
                              }}
                              disabled={deleteCustomReason.isPending}>
                              {t("delete")}
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes input */}
            <div className="mt-4">
              <p className="text-emphasis text-sm font-medium">{t("notes")}</p>
              <TextArea
                data-testid="notes_input"
                className="border-subtle mt-2 h-10 w-full rounded-lg border px-2"
                placeholder={t("additional_notes")}
                {...register("notes")}
                onChange={(e) => {
                  const newNotes = e?.target.value;
                  setValue("notes", newNotes);
                  if (!newNotes?.trim()) {
                    setValue("showNotePublicly", false);
                  }
                }}
              />
              <Controller
                control={control}
                name="showNotePublicly"
                render={({ field: { value, onChange } }) => (
                  <div className="mt-2 flex items-center">
                    <Checkbox
                      id="show-note-publicly"
                      data-testid="show-note-publicly-checkbox"
                      checked={value ?? false}
                      onCheckedChange={onChange}
                      disabled={!hasValidNotes}
                    />
                    <label
                      htmlFor="show-note-publicly"
                      className={classNames(
                        "ml-2 text-sm",
                        hasValidNotes ? "text-emphasis cursor-pointer" : "text-muted cursor-not-allowed"
                      )}>
                      {t("show_note_and_custom_reason_publicly_description")}
                    </label>
                  </div>
                )}
              />
            </div>

            <div className="bg-cal-muted my-4 rounded-xl p-5">
              <div className="flex flex-row">
                <Switch
                  disabled={!hasTeamPlan}
                  data-testid="profile-redirect-switch"
                  checked={profileRedirect}
                  id="profile-redirect-switch"
                  onCheckedChange={(state) => {
                    setProfileRedirect(state);
                    if (!state) {
                      setValue("toTeamUserId", null);
                    }
                  }}
                  label={hasTeamPlan ? t("redirect_team_enabled") : t("redirect_team_disabled")}
                />
                {!hasTeamPlan && (
                  <div className="mx-2" data-testid="upgrade-team-badge">
                    <UpgradeTeamsBadge />
                  </div>
                )}
              </div>

              {profileRedirect && (
                <div className="mb-2">
                  <Label className="text-emphasis mt-6">{t("select_team_member")}</Label>
                  <Controller
                    control={control}
                    name="toTeamUserId"
                    render={({ field: { onChange, value } }) => (
                      <Select
                        className="mt-2"
                        data-testid="team_username_select"
                        isSearchable={true}
                        value={redirectToMemberListOptions
                          .filter((member) => member.value !== getValues("forUserId"))
                          .find((member) => member.value === value)}
                        placeholder={t("search")}
                        options={redirectToMemberListOptions.filter(
                          (member) => member.value !== getValues("forUserId")
                        )}
                        onInputChange={(newValue) => setSearchRedirectMember(newValue)}
                        onChange={(selectedOption) => {
                          if (selectedOption?.value) {
                            onChange(selectedOption.value);
                          }
                        }}
                        onMenuScrollToBottom={() => {
                          if (redirectMembers.hasNextPage && !redirectMembers.isFetchingNextPage) {
                            redirectMembers.fetchNextPage();
                          }
                        }}
                        isLoading={redirectMembers.isFetchingNextPage}
                      />
                    )}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter showDivider noSticky>
            <div className="flex">
              <Button
                color="minimal"
                type="button"
                onClick={() => {
                  closeModal();
                }}
                className="mr-1">
                {t("cancel")}
              </Button>
              <Button
                form="create-or-edit-ooo-form"
                color="primary"
                type="submit"
                disabled={isSubmitting || isReasonListPending}
                data-testid="create-or-edit-entry-ooo-redirect">
                {currentlyEditingOutOfOfficeEntry ? t("save") : t("create")}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
