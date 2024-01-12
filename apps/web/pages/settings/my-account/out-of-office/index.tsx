import { Trash2 } from "lucide-react";
import React, { useState } from "react";
import { useForm, useFormState } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useHasTeamPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Button, Meta, showToast, Select, SkeletonText, UpgradeTeamsBadge, Switch } from "@calcom/ui";
import { TableNew, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { OutOfOfficeDateRangePicker } from "@components/out-of-office/DateRangePicker";

export type BookingRedirectForm = {
  startDate: string;
  endDate: string;
  toTeamUserId: number | null;
};

const OutOfOfficeSection = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();

  const [dateRange, setDateRange] = useState<[Date | null, Date | null, null | null]>([
    dayjs().startOf("d").toDate(),
    dayjs().add(1, "d").endOf("d").toDate(),
    null,
  ]);
  const [profileRedirect, setProfileRedirect] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ label: string; value: number | null } | null>(null);

  const { handleSubmit, setValue } = useForm<BookingRedirectForm>({
    defaultValues: {
      startDate: dateRange[0]?.toISOString(),
      endDate: dateRange[1]?.toISOString(),
      toTeamUserId: null,
    },
  });

  const createOutOfOfficeEntry = trpc.viewer.outOfOfficeCreate.useMutation({
    onSuccess: () => {
      showToast(t("success_entry_created"), "success");
      utils.viewer.outOfOfficeEntriesList.invalidate();
      setProfileRedirect(false);
    },
    onError: (error) => {
      showToast(t(error.message), "error");
    },
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

  return (
    <>
      <form
        onSubmit={handleSubmit((data) => {
          createOutOfOfficeEntry.mutate(data);
          setValue("toTeamUserId", null);
          setSelectedMember(null);
        })}>
        <div className="border-subtle flex flex-col rounded-b-lg border border-t-0 p-6 px-6 py-8 text-sm">
          {/* Add startDate and end date inputs */}
          <div className="border-subtle mt-2 rounded-lg border bg-gray-50 p-6 dark:bg-transparent">
            {/* Add toggle to enable/disable redirect */}
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
            <div className="mt-4 flex flex-row">
              {profileRedirect && (
                <div className="mr-2 w-1/2 lg:w-1/3">
                  <p className="text-emphasis block text-sm font-medium">{t("team_member")}</p>
                  <Select
                    className="mt-1 h-4 max-w-[350px] text-white"
                    name="toTeamUsername"
                    data-testid="team_username_select"
                    value={selectedMember}
                    placeholder={t("select_team_member")}
                    isSearchable
                    innerClassNames={{
                      control: "h-[38px]",
                    }}
                    options={memberListOptions}
                    onChange={(selectedOption) => {
                      if (selectedOption?.value) {
                        setSelectedMember(selectedOption);
                        setValue("toTeamUserId", selectedOption?.value);
                      }
                    }}
                  />
                </div>
              )}
              <div className="w-1/2 lg:w-1/3">
                <p className="text-emphasis mb-1 block text-sm font-medium">{t("time_range")}</p>

                <OutOfOfficeDateRangePicker
                  dateRange={dateRange}
                  setValue={setValue}
                  setDateRange={setDateRange}
                />
              </div>
            </div>

            <div className="mt-7">
              <Button
                color="primary"
                type="submit"
                disabled={createOutOfOfficeEntry.isLoading}
                data-testid="create-entry-ooo-redirect">
                {t("create_entry")}
              </Button>
            </div>
          </div>

          <OutOfOfficeEntriesList />
        </div>
      </form>
    </>
  );
};

const OutOfOfficeEntriesList = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { data, isLoading } = trpc.viewer.outOfOfficeEntriesList.useQuery();
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
  if (data === null || data?.length === 0 || data === undefined) return null;
  return (
    <div className="border-subtle mt-6 rounded-lg border">
      <TableNew className="border-0">
        <TableHeader>
          <TableRow>
            <TableHead className="rounded-tl-lg font-normal capitalize">{t("time_range")}</TableHead>
            <TableHead className="font-normal">{t("username")}</TableHead>

            <TableHead className="rounded-tr-lg font-normal">{t("action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((item) => (
            <TableRow key={item.id} data-testid={`table-redirect-${item.toUser?.username || "n-a"}`}>
              <TableCell>
                <p className="px-2">
                  {dayjs(item.start).format("ll")} - {dayjs(item.end).format("ll")}
                </p>
              </TableCell>
              <TableCell>
                <p className="px-2">{item.toUser?.username || "N/A"}</p>
              </TableCell>
              <TableCell className="px-4">
                <Button
                  type="button"
                  color="minimal"
                  variant="icon"
                  disabled={deleteOutOfOfficeEntryMutation.isLoading}
                  StartIcon={Trash2}
                  onClick={() => {
                    deleteOutOfOfficeEntryMutation.mutate({ outOfOfficeUid: item.uuid });
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
          {isLoading && (
            <TableRow>
              {new Array(6).fill(0).map((_, index) => (
                <TableCell key={index}>
                  <SkeletonText className="h-8 w-full" />
                </TableCell>
              ))}
            </TableRow>
          )}

          {!isLoading && (data === undefined || data.length === 0) && (
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

  return (
    <>
      <Meta title={t("out_of_office")} description={t("out_of_office_description")} borderInShellHeader />
      <ShellMain>
        <OutOfOfficeSection />
      </ShellMain>
    </>
  );
};

OutOfOfficePage.getLayout = getLayout;
OutOfOfficePage.PageWrapper = PageWrapper;

export default OutOfOfficePage;
