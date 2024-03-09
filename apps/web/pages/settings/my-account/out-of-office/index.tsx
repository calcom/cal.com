import { Clock, Plus, Trash2 } from "lucide-react";
import { Trans } from "next-i18next";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Controller, useForm, useFormState } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useHasTeamPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import {
  Button,
  Meta,
  showToast,
  Select,
  SkeletonText,
  UpgradeTeamsBadge,
  Switch,
  DateRangePicker,
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter,
  TextArea,
} from "@calcom/ui";
import { TableNew, TableBody, TableCell, TableRow } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export type BookingRedirectForm = {
  dateRange: { startDate: Date; endDate: Date };
  offset: number;
  toTeamUserId: number | null;
  reasonId: number;
  notes?: string;
};

const CreateOutOfOfficeEntryModal = ({
  openModal,
  closeModal,
}: {
  openModal: boolean;
  closeModal: () => void;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const [selectedReason, setSelectedReason] = useState<{ label: string; value: number } | null>(null);
  const [profileRedirect, setProfileRedirect] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ label: string; value: number | null } | null>(null);

  const [dateRange] = useState<{ startDate: Date; endDate: Date }>({
    startDate: dayjs().startOf("d").toDate(),
    endDate: dayjs().add(1, "d").endOf("d").toDate(),
  });

  const { hasTeamPlan } = useHasTeamPlan();
  const { data: listMembers } = trpc.viewer.teams.listMembers.useQuery({});
  const me = useMeQuery();
  const memberListOptions: {
    value: number | null;
    label: string;
  }[] =
    listMembers
      ?.filter((member) => me?.data?.id !== member.id)
      .map((member) => ({
        value: member.id || null,
        label: member.name || "",
      })) || [];

  const { handleSubmit, setValue, getValues, control, register } = useForm<BookingRedirectForm>({
    defaultValues: {
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      offset: dayjs().utcOffset(),
      toTeamUserId: null,
      reasonId: 1,
    },
  });

  const createOutOfOfficeEntry = trpc.viewer.outOfOfficeCreate.useMutation({
    onSuccess: () => {
      showToast(t("success_entry_created"), "success");
      utils.viewer.outOfOfficeEntriesList.invalidate();
      setProfileRedirect(false);
      closeModal();
    },
    onError: (error) => {
      showToast(t(error.message), "error");
    },
  });

  const { data: outOfOfficeReasonList } = trpc.viewer.outOfOfficeReasonList.useQuery();

  const reasonList = [
    ...(outOfOfficeReasonList || []).map((reason) => ({
      label: `${reason.emoji} ${reason.userId === null ? t(reason.reason) : reason.reason}`,
      value: reason.id,
    })),
  ];

  return (
    <Dialog open={openModal}>
      <DialogContent
        enableOverflow
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}>
        <form
          id="create-ooo-form"
          onSubmit={handleSubmit((data) => {
            createOutOfOfficeEntry.mutate(data);
            setValue("toTeamUserId", null);
            setValue("notes", "");
            setSelectedReason(null);
            setSelectedMember(null);
          })}>
          <div className="px-1">
            <DialogHeader title={t("create_an_out_of_office")} />
            <div>
              <p className="text-emphasis mb-1 block text-sm font-medium capitalize">{t("dates")}</p>
              <div>
                <Controller
                  name="dateRange"
                  control={control}
                  defaultValue={dateRange}
                  render={() => (
                    <DateRangePicker
                      startDate={getValues("dateRange").startDate}
                      endDate={getValues("dateRange").endDate}
                      onDatesChange={({ startDate, endDate }) => {
                        setValue("dateRange", {
                          startDate,
                          endDate,
                        });
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
                <Select
                  className="mb-0 mt-1 text-white"
                  name="reason"
                  data-testid="reason_select"
                  value={selectedReason}
                  placeholder={t("ooo_select_reason")}
                  options={reasonList}
                  onChange={(selectedOption) => {
                    if (selectedOption?.value) {
                      setSelectedReason(selectedOption);
                      setValue("reasonId", selectedOption?.value);
                    }
                  }}
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
                <div className="mt-4">
                  <div className="h-16">
                    <p className="text-emphasis block text-sm font-medium">{t("team_member")}</p>
                    <Select
                      className="mt-1 h-4 text-white"
                      name="toTeamUsername"
                      data-testid="team_username_select"
                      value={selectedMember}
                      placeholder={t("select_team_member")}
                      isSearchable
                      options={memberListOptions}
                      onChange={(selectedOption) => {
                        if (selectedOption?.value) {
                          setSelectedMember(selectedOption);
                          setValue("toTeamUserId", selectedOption?.value);
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter showDivider>
            <div className="flex">
              <Button color="minimal" type="button" onClick={() => closeModal()} className="mr-1">
                Cancel
              </Button>
              <Button
                form="create-ooo-form"
                color="primary"
                type="submit"
                disabled={createOutOfOfficeEntry.isPending}
                data-testid="create-entry-ooo-redirect">
                {t("create")}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const OutOfOfficeEntriesList = () => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { data, isPending } = trpc.viewer.outOfOfficeEntriesList.useQuery();
  const deleteOutOfOfficeEntryMutation = trpc.viewer.outOfOfficeEntryDelete.useMutation({
    onSuccess: () => {
      showToast(t("success_deleted_entry_out_of_office"), "success");
      utils.viewer.outOfOfficeEntriesList.invalidate();
      useFormState;
    },
    onError: () => {
      showToast(`An error ocurred`, "error");
    },
  });
  if (data === null || data?.length === 0 || (data === undefined && !isPending)) return <EmptyOOO />;
  return (
    <div className="border-subtle mt-6 rounded-lg border">
      <TableNew className="border-0">
        <TableBody>
          {data?.map((item) => (
            <TableRow key={item.id} data-testid={`table-redirect-${item.toUser?.username || "n-a"}`}>
              <TableCell className="flex flex-row justify-between p-4">
                <div className="flex flex-row">
                  <div className="flex w-10 items-center justify-center rounded-full bg-gray-50">
                    {item?.reason?.emoji || "🏝️"}
                  </div>

                  <div className="ml-2 flex flex-col">
                    <p className="px-2 font-bold">
                      {dayjs.utc(item.start).format("ll")} - {dayjs.utc(item.end).format("ll")}
                    </p>
                    <p className="px-2">
                      {item.toUser?.username ? (
                        <Trans
                          i18nKey="ooo_forwarding_to"
                          values={{
                            username: item.toUser?.username,
                          }}
                          components={{
                            span: <span className="text-subtle font-bold" />,
                          }}
                        />
                      ) : (
                        <>{t("ooo_not_forwarding")}</>
                      )}
                    </p>
                  </div>
                </div>

                <Button
                  className="self-center rounded-lg border"
                  type="button"
                  color="minimal"
                  variant="icon"
                  disabled={deleteOutOfOfficeEntryMutation.isPending}
                  StartIcon={Trash2}
                  onClick={() => {
                    deleteOutOfOfficeEntryMutation.mutate({ outOfOfficeUid: item.uuid });
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
          {isPending && (
            <>
              {new Array(2).fill(0).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <SkeletonText className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            </>
          )}

          {!isPending && (data === undefined || data.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                <p className="text-subtle text-sm">{t("no_redirects_found")}</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </TableNew>
    </div>
  );
};

const OutOfOfficePage = () => {
  const { t } = useLocale();

  const params = useSearchParams();
  const openModalOnStart = !!params?.get("om");
  useEffect(() => {
    if (openModalOnStart) {
      setOpenModal(true);
    }
  }, [openModalOnStart]);

  const [openModal, setOpenModal] = useState(false);
  return (
    <>
      <Meta
        title={t("out_of_office")}
        description={t("out_of_office_description")}
        borderInShellHeader={false}
        CTA={
          <Button
            color="primary"
            className="flex w-20 items-center justify-between px-4"
            onClick={() => setOpenModal(true)}>
            <Plus size={16} /> {t("add")}
          </Button>
        }
      />
      <CreateOutOfOfficeEntryModal openModal={openModal} closeModal={() => setOpenModal(false)} />
      <OutOfOfficeEntriesList />
    </>
  );
};

const EmptyOOO = () => {
  const { t } = useLocale();
  return (
    <div className="mt-10 flex h-full flex-col items-center justify-center rounded-lg border border-dashed p-2 md:p-0">
      <div className="relative mt-14">
        <div className="dark:bg-darkgray-50 absolute -left-3 -top-3 -z-20 h-[70px] w-[70px] -rotate-[24deg] rounded-3xl border-2 border-[#e5e7eb] p-8 opacity-40 dark:opacity-80">
          <div className="w-12" />
        </div>
        <div className="dark:bg-darkgray-50 absolute -top-3 left-3 -z-10 h-[70px] w-[70px] rotate-[24deg] rounded-3xl border-2 border-[#e5e7eb] p-8 opacity-60 dark:opacity-90">
          <div className="w-12" />
        </div>
        <div className="dark:bg-darkgray-50 relative z-0 flex h-[70px] w-[70px] items-center justify-center rounded-3xl border-2 border-[#e5e7eb] bg-white">
          <Clock size={28} />
          <div className="dark:bg-darkgray-50 absolute right-4 top-5 h-[12px] w-[12px] rotate-[56deg] bg-white text-lg font-bold" />
          <span className="absolute right-4 top-3 font-sans text-sm font-extrabold">z</span>
        </div>
      </div>
      <div className="mb-10 mt-5 w-full md:w-[460px]">
        <p className="font-cal text-center text-xl font-bold dark:text-white">{t("ooo_empty_title")}</p>
        <p className="text-subtle mt-2 text-center text-sm">{t("ooo_empty_description")}</p>
      </div>
    </div>
  );
};

OutOfOfficePage.getLayout = getLayout;
OutOfOfficePage.PageWrapper = PageWrapper;

export default OutOfOfficePage;
