import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { classNames } from "@calcom/lib";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useHasTeamPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useInViewObserver } from "@calcom/lib/hooks/useInViewObserver";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import {
  Button,
  DateRangePicker,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  Select,
  showToast,
  Switch,
  TextArea,
  UpgradeTeamsBadge,
  Label,
  Input,
} from "@calcom/ui";

import { OutOfOfficeTab } from "./OutOfOfficeToggleGroup";

export type BookingRedirectForm = {
  dateRange: { startDate: Date; endDate: Date };
  offset: number;
  toTeamUserId: number | null;
  reasonId: number;
  notes?: string;
  uuid?: string | null;
  forUserId: number | null;
};

type Option = { value: number; label: string };

export const CreateOrEditOutOfOfficeEntryModal = ({
  openModal,
  closeModal,
  currentlyEditingOutOfOfficeEntry,
  setOOOEntriesUpdated,
  setOOOEntriesAdded,
}: {
  openModal: boolean;
  closeModal: () => void;
  currentlyEditingOutOfOfficeEntry: BookingRedirectForm | null;
  setOOOEntriesUpdated?: Dispatch<SetStateAction<number>> | undefined;
  setOOOEntriesAdded?: Dispatch<SetStateAction<number>> | undefined;
}) => {
  const { t } = useLocale();

  const searchParams = useCompatSearchParams();
  const oooType = searchParams?.get("type") ?? OutOfOfficeTab.MINE;

  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 500);

  const members = trpc.viewer.teams.legacyListMembers.useInfiniteQuery(
    { limit: 10, searchText: debouncedSearch },
    {
      enabled: true,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const me = useMeQuery();

  const oooMemberListOptions: {
    value: number;
    label: string;
    avatarUrl: string | null;
  }[] =
    members?.data?.pages
      .flatMap((page) => page.members)
      ?.filter((member) => me?.data?.id !== member.id)
      .map((member) => ({
        value: member.id,
        label: member.name || member.username || "",
        avatarUrl: member.avatarUrl,
      })) || [];

  const redirectToMemberListOptions: {
    value: number;
    label: string;
    avatarUrl: string | null;
  }[] =
    members?.data?.pages
      .flatMap((page) => page.members)
      ?.filter((member) =>
        oooType === OutOfOfficeTab.MINE ? me?.data?.id !== member.id : oooType === OutOfOfficeTab.TEAM
      )
      .map((member) => ({
        value: member.id,
        label: member.name || member.username || "",
        avatarUrl: member.avatarUrl,
      })) || [];

  const { ref: observerRef } = useInViewObserver(() => {
    if (members.hasNextPage && !members.isFetching) {
      members.fetchNextPage();
    }
  }, document.querySelector('[role="dialog"]'));

  const { data: outOfOfficeReasonList } = trpc.viewer.outOfOfficeReasonList.useQuery();

  const reasonList = (outOfOfficeReasonList || []).map((reason) => ({
    label: `${reason.emoji} ${reason.userId === null ? t(reason.reason) : reason.reason}`,
    value: reason.id,
  }));

  const [profileRedirect, setProfileRedirect] = useState(!!currentlyEditingOutOfOfficeEntry?.toTeamUserId);

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
            startDate: dayjs().utc().startOf("d").toDate(),
            endDate: dayjs().utc().add(1, "d").endOf("d").toDate(),
          },
          offset: dayjs().utcOffset(),
          toTeamUserId: null,
          reasonId: 1,
          forUserId: null,
        },
  });

  const watchedTeamUserId = watch("toTeamUserId");
  const watchForUserId = watch("forUserId");

  const createOrEditOutOfOfficeEntry = trpc.viewer.outOfOfficeCreateOrUpdate.useMutation({
    onSuccess: () => {
      showToast(
        currentlyEditingOutOfOfficeEntry
          ? t("success_edited_entry_out_of_office")
          : t("success_entry_created"),
        "success"
      );
      if (setOOOEntriesUpdated) {
        setOOOEntriesUpdated((previousValue) => previousValue + 1);
      }
      if (setOOOEntriesAdded && !currentlyEditingOutOfOfficeEntry) {
        setOOOEntriesAdded((previousValue) => previousValue + 1);
      }
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
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}>
        <form
          id="create-or-edit-ooo-form"
          onSubmit={handleSubmit((data) => {
            createOrEditOutOfOfficeEntry.mutate(data);
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
            {oooType === "team" && (
              <div className="mb-2">
                <Label className="text-emphasis mt-6">{t("select_team_member")}</Label>
                <div className="mt-2">
                  <Input
                    type="text"
                    placeholder={t("search")}
                    onChange={(e) => setSearchText(e.target.value)}
                    value={searchText}
                    disabled={!!currentlyEditingOutOfOfficeEntry}
                  />
                  <div className="scroll-bar flex h-[150px] flex-col gap-0.5 overflow-y-scroll rounded-md border p-1">
                    {oooMemberListOptions.map((member) => (
                      <label
                        key={member.value}
                        data-testid={`ooofor_username_select_${member.value}`}
                        tabIndex={watchForUserId === member.value ? -1 : 0}
                        role="radio"
                        aria-checked={watchForUserId === member.value}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setValue("forUserId", member.value, { shouldDirty: true });
                          }
                        }}
                        className={classNames(
                          "hover:bg-subtle focus:bg-subtle focus:ring-emphasis cursor-pointer items-center justify-between gap-0.5 rounded-sm py-2 outline-none focus:ring-2",
                          watchForUserId === member.value && "bg-subtle"
                        )}>
                        <div className="flex flex-1 items-center space-x-3">
                          <input
                            type="radio"
                            className="hidden"
                            checked={watchForUserId === member.value}
                            onChange={() => setValue("forUserId", member.value, { shouldDirty: true })}
                          />
                          <span className="text-emphasis w-full px-2 text-sm">{member.label}</span>
                        </div>
                      </label>
                    ))}
                    <div className="text-default text-center" ref={observerRef}>
                      <Button
                        color="minimal"
                        loading={members.isFetchingNextPage}
                        disabled={!members.hasNextPage}
                        onClick={() => members.fetchNextPage()}>
                        {members.hasNextPage ? t("load_more_results") : t("no_more_results")}
                      </Button>
                    </div>
                  </div>
                </div>
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
                      dates={{ startDate: value.startDate, endDate: value.endDate }}
                      onDatesChange={(values) => {
                        onChange(values);
                      }}
                    />
                  )}
                />
              </div>
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
                      value={reasonList.find((reason) => reason.value === value)}
                      placeholder={t("ooo_select_reason")}
                      options={reasonList}
                      onChange={(selectedOption) => {
                        if (selectedOption?.value) {
                          onChange(selectedOption.value);
                        }
                      }}
                    />
                  )}
                />
              </div>
            </div>

            {/* Notes input */}
            <div className="mt-4">
              <p className="text-emphasis block text-sm font-medium">{t("notes")}</p>
              <TextArea
                data-testid="notes_input"
                className="border-subtle mt-1 h-10 w-full rounded-lg border px-2"
                placeholder={t("additional_notes")}
                {...register("notes")}
                onChange={(e) => {
                  setValue("notes", e?.target.value);
                }}
              />
            </div>

            <div className="bg-muted my-4 rounded-xl p-5">
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
                  <div className="mt-2">
                    <Input
                      type="text"
                      placeholder={t("search")}
                      onChange={(e) => setSearchText(e.target.value)}
                      value={searchText}
                    />
                    <div className="scroll-bar flex h-[150px] flex-col gap-0.5 overflow-y-scroll rounded-md border p-1">
                      {redirectToMemberListOptions
                        .filter((member) => member.value !== getValues("forUserId"))
                        .map((member) => (
                          <label
                            key={member.value}
                            data-testid={`team_username_select_${member.value}`}
                            tabIndex={watchedTeamUserId === member.value ? -1 : 0}
                            role="radio"
                            aria-checked={watchedTeamUserId === member.value}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setValue("toTeamUserId", member.value, { shouldDirty: true });
                              }
                            }}
                            className={classNames(
                              "hover:bg-subtle focus:bg-subtle focus:ring-emphasis cursor-pointer items-center justify-between gap-0.5 rounded-sm py-2 outline-none focus:ring-2",
                              watchedTeamUserId === member.value && "bg-subtle"
                            )}>
                            <div className="flex flex-1 items-center space-x-3">
                              <input
                                type="radio"
                                className="hidden"
                                checked={watchedTeamUserId === member.value}
                                onChange={() => setValue("toTeamUserId", member.value, { shouldDirty: true })}
                              />
                              <span className="text-emphasis w-full px-2 text-sm">{member.label}</span>
                            </div>
                          </label>
                        ))}
                      <div className="text-default text-center" ref={observerRef}>
                        <Button
                          color="minimal"
                          loading={members.isFetchingNextPage}
                          disabled={!members.hasNextPage}
                          onClick={() => members.fetchNextPage()}>
                          {members.hasNextPage ? t("load_more_results") : t("no_more_results")}
                        </Button>
                      </div>
                    </div>
                  </div>
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
                disabled={isSubmitting}
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
