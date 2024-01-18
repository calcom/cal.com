import { Trash2 } from "lucide-react";
import React, { useState } from "react";
import { Controller, useForm, useFormState } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { ShellMain } from "@calcom/features/shell/Shell";
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
} from "@calcom/ui";
import { TableNew, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export type BookingRedirectForm = {
  dateRange: { startDate: Date; endDate: Date };
  offset: number;
  toTeamUserId: number | null;
};

const OutOfOfficeSection = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();

  const [profileRedirect, setProfileRedirect] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ label: string; value: number | null } | null>(null);

  const [dateRange] = useState<{ startDate: Date; endDate: Date }>({
    startDate: dayjs().startOf("d").toDate(),
    endDate: dayjs().add(1, "d").endOf("d").toDate(),
  });

  const { handleSubmit, setValue, getValues, control } = useForm<BookingRedirectForm>({
    defaultValues: {
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      offset: dayjs().utcOffset(),
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
        <div className="border-subtle flex flex-col border border-b-0 border-t-0 p-6 px-6 py-8 text-sm">
          {/* Add startDate and end date inputs */}
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
          <div className="mt-4 grid grid-rows-2 gap-2 md:grid-cols-2">
            {profileRedirect && (
              <div>
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
            )}
            <div>
              <p className="text-emphasis mb-1 block text-sm font-medium">{t("time_range")}</p>
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
          </div>
        </div>
        <SectionBottomActions className="mb-6" align="end">
          <Button
            color="primary"
            type="submit"
            disabled={createOutOfOfficeEntry.isLoading}
            data-testid="create-entry-ooo-redirect">
            {t("create_entry")}
          </Button>
        </SectionBottomActions>
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
        <TableHeader className="md:z-1">
          <TableRow>
            <TableHead className="rounded-tl-lg font-normal capitalize">{t("time_range")}</TableHead>
            <TableHead className="font-normal">{t("redirect_to")}</TableHead>

            <TableHead className="rounded-tr-lg font-normal">{t("action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((item) => (
            <TableRow key={item.id} data-testid={`table-redirect-${item.toUser?.username || "n-a"}`}>
              <TableCell>
                <p className="px-2">
                  {dayjs.utc(item.start).format("ll")} - {dayjs.utc(item.end).format("ll")}
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
        <OutOfOfficeEntriesList />
      </ShellMain>
    </>
  );
};

OutOfOfficePage.getLayout = getLayout;
OutOfOfficePage.PageWrapper = PageWrapper;

export default OutOfOfficePage;
