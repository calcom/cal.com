import React, { useState } from "react";
import { useForm, useFormState } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { ShellMain } from "@calcom/features/shell/Shell";
import { CAL_URL } from "@calcom/lib/constants";
import useHasPaidPlan from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Button, Meta, showToast, Badge, Select, SkeletonText, UpgradeTeamsBadge, Switch } from "@calcom/ui";
import { TableNew, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@calcom/ui";
import { Link, Send, Trash2 } from "@calcom/ui/components/icon";

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
      showToast(t("success_request"), "success");
      utils.viewer.outOfOfficeEntriesList.invalidate();
      setProfileRedirect(false);
    },
    onError: (error) => {
      showToast(t(error.message), "error");
    },
  });

  const { hasPaidPlan } = useHasPaidPlan();
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
        <div className="border-subtle mt-6 flex flex-col rounded-t-lg border border-b-0 p-6 text-sm">
          <p className="text-default font-cal text-base font-semibold">{t("going_away_title")}</p>
          {/* Add startDate and end date inputs */}
          <div className="mt-2">
            <p className="text-emphasis mb-2 mt-4 block text-sm">{t("select_date_range_availability")}</p>
            <div className=" w-[250px]">
              <OutOfOfficeDateRangePicker
                dateRange={dateRange}
                setValue={setValue}
                setDateRange={setDateRange}
              />
            </div>
          </div>

          {/* Add toggle to enable/disable redirect */}
          <div className="mt-6 flex flex-row">
            <Switch
              disabled={!hasPaidPlan}
              data-testid="profile-redirect-switch"
              checked={profileRedirect}
              id="profile-redirect-switch"
              onCheckedChange={(state) => {
                setProfileRedirect(state);
              }}
              label={hasPaidPlan ? t("redirect_team_enabled") : t("redirect_team_disabled")}
            />
            {!hasPaidPlan && (
              <div className="mx-2" data-testid="upgrade-team-badge">
                <UpgradeTeamsBadge />
              </div>
            )}
          </div>

          {profileRedirect && (
            <div className="mt-6">
              <p className="text-sm">{t("booking_redirect_action")}</p>

              <Select
                className="mt-1 max-w-[350px] text-white"
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
        </div>
        <SectionBottomActions align="end">
          <Button
            color="primary"
            type="submit"
            disabled={createOutOfOfficeEntry.isLoading}
            data-testid="send-request-redirect"
            EndIcon={() => (
              <Send className="font-semi mx-2 h-5 w-5 text-white dark:text-black" aria-hidden="true" />
            )}>
            {profileRedirect ? t("send_request") : "Create out of office entry"}
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
    <>
      <div className="border-subtle mt-6 flex flex-col rounded-lg border p-6 text-sm">
        {/* Table that displays current request and status */}
        <p className="text-default font-cal text-base font-semibold">{t("out_of_office_unavailable_list")}</p>
        <TableNew className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead className="capitalize">{t("from")}</TableHead>
              <TableHead>{t("to")}</TableHead>
              <TableHead>{t("team_username")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("share")}</TableHead>
              <TableHead>{t("delete")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((item) => (
              <TableRow key={item.id} data-testid={`table-redirect-${item.toUser?.username || "n-a"}`}>
                <TableCell>
                  <p className="px-2">{dayjs(item.start).format("YYYY-MM-DD")}</p>
                </TableCell>
                <TableCell>
                  <p className="px-2">{dayjs(item.end).format("YYYY-MM-DD")}</p>
                </TableCell>
                <TableCell>
                  <p className="px-2">{item.toUser?.username || "N/A"}</p>
                </TableCell>
                <TableCell>
                  {item.status === null && <p className="px-4 text-xs">N/A</p>}
                  {item.status === "PENDING" && (
                    <Badge variant="warning" className="px-4 text-xs">
                      {t("pending")}
                    </Badge>
                  )}
                  {item.status === "ACCEPTED" && (
                    <Badge variant="success" className="px-4 text-xs capitalize">
                      {t("accepted")}
                    </Badge>
                  )}
                  {item.status === "REJECTED" && (
                    <Badge variant="error" className="px-4 text-xs">
                      {t("rejected")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {/* Button to share link to accept */}
                  {item.toUser?.username && (
                    <Button
                      className="px-4"
                      tooltip={t("copy_link_booking_redirect_request")}
                      color="minimal"
                      onClick={() => {
                        navigator.clipboard.writeText(`${CAL_URL}/booking-forwarding/accept/${item.uuid}`);
                      }}>
                      <Link width={15} height={15} />
                    </Button>
                  )}
                  {!item.toUser?.username && <p className="px-4">N/A</p>}
                </TableCell>
                <TableCell>
                  <Button
                    className="px-4"
                    disabled={deleteOutOfOfficeEntryMutation.isLoading}
                    color="destructive"
                    onClick={() => {
                      deleteOutOfOfficeEntryMutation.mutate({ outOfOfficeUid: item.uuid });
                    }}>
                    <Trash2 width={15} height={15} />
                  </Button>
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
    </>
  );
};

const OutOfOfficePage = () => {
  const { t } = useLocale();

  return (
    <>
      <Meta
        title={t("out_of_office")}
        description={t("out_of_office_description")}
        borderInShellHeader={false}
      />
      <ShellMain>
        <>
          <div className="mt-2"> </div>
          <OutOfOfficeSection />
          <OutOfOfficeEntriesList />
        </>
      </ShellMain>
    </>
  );
};

OutOfOfficePage.getLayout = getLayout;
OutOfOfficePage.PageWrapper = PageWrapper;

export default OutOfOfficePage;
