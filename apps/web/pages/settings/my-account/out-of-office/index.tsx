import React, { useState } from "react";
import { useForm, useFormState } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { ShellMain } from "@calcom/features/shell/Shell";
import { UpgradeTip } from "@calcom/features/tips";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Button, ButtonGroup, Meta, showToast, Badge, Select, SkeletonText } from "@calcom/ui";
import { TableNew, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@calcom/ui";
import { FastForward, Link, Moon, Send, Trash2 } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";
import { OutOfOfficeDateRangePicker } from "@components/out-of-office/DateRangePicker";

export type BookingForwardingForm = {
  startDate: string;
  endDate: string;
  toTeamUserId: number | null;
};

const BookingForwardingSection = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();

  const [dateRange, setDateRange] = useState<[Date | null, Date | null, null | null]>([
    dayjs().startOf("d").toDate(),
    dayjs().add(1, "d").endOf("d").toDate(),
    null,
  ]);
  const [selectedMember, setSelectedMember] = useState<{ label: string; value: number | null } | null>(null);

  const { handleSubmit, setValue } = useForm<BookingForwardingForm>({
    defaultValues: {
      startDate: dateRange[0]?.toISOString(),
      endDate: dateRange[1]?.toISOString(),
      toTeamUserId: null,
    },
  });

  const createBookingForwardingMutation = trpc.viewer.bookingForwardingCreate.useMutation({
    onSuccess: () => {
      showToast(t("success_request"), "success");
      utils.viewer.bookingForwardingList.invalidate();
    },
    onError: (error) => {
      showToast(t(error.message), "error");
    },
  });

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
          createBookingForwardingMutation.mutate(data);
          setValue("toTeamUserId", null);
          setSelectedMember(null);
        })}>
        <div className="border-subtle mt-6 flex flex-col rounded-t-lg border border-b-0 p-6 text-sm">
          <p className="text-default font-cal text-base font-semibold">{t("booking_forwarding_action")}</p>

          {/* Add startDate and end date inputs */}
          <div className="mt-2">
            <p className="text-emphasis mb-2 mt-4 block text-sm font-medium">
              {t("select_date_range_availability")}
            </p>
            <div className=" w-[250px]">
              <OutOfOfficeDateRangePicker
                dateRange={dateRange}
                setValue={setValue}
                setDateRange={setDateRange}
              />
            </div>
          </div>

          <div className="mt-6">
            <p className="text-emphasis mb-2 block text-sm font-medium">{t("select_team_member")}</p>
            <Select
              className="mt-1 max-w-[350px] text-white"
              name="toTeamUsername"
              data-testid="team_username_select"
              value={selectedMember}
              placeholder={t("select")}
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
        <SectionBottomActions align="start">
          <Button
            color="primary"
            type="submit"
            disabled={createBookingForwardingMutation.isLoading}
            data-testid="send-request-forwarding"
            EndIcon={() => (
              <Send className="font-semi mx-2 h-5 w-5 text-white dark:text-black" aria-hidden="true" />
            )}>
            {t("send_request")}
          </Button>
        </SectionBottomActions>
      </form>
    </>
  );
};

const BookingForwardingList = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { data, isLoading } = trpc.viewer.bookingForwardingList.useQuery();
  const deleteBookingForwardingMutation = trpc.viewer.bookingForwardingDelete.useMutation({
    onSuccess: () => {
      showToast(`Successfully deleted request`, "success");
      utils.viewer.bookingForwardingList.invalidate();
      useFormState;
    },
    onError: () => {
      showToast(`An error ocurred`, "error");
    },
  });
  if (data === null || data?.length === 0) return null;
  return (
    <>
      <div className="border-subtle mt-6 flex flex-col rounded-lg border p-6 text-sm">
        {/* Table that displays current request and status */}
        <p className="text-default font-cal text-base font-semibold">{t("forwarding_list")}</p>
        <TableNew className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead className="capitalize">{t("from")}</TableHead>
              <TableHead>{t("to")}</TableHead>
              <TableHead>{t("username")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("share")}</TableHead>
              <TableHead>{t("delete")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((item) => (
              <TableRow key={item.id} data-testid={`table-forwarding-${item.toUser?.username}`}>
                <TableCell>{dayjs(item.start).format("YYYY-MM-DD")}</TableCell>
                <TableCell>
                  <p>{dayjs(item.end).format("YYYY-MM-DD")}</p>
                </TableCell>
                <TableCell>
                  <p>{item.toUser?.username}</p>
                </TableCell>
                <TableCell>
                  {item.status === "PENDING" && (
                    <Badge variant="warning" className="text-xs">
                      {t("pending")}
                    </Badge>
                  )}
                  {item.status === "ACCEPTED" && (
                    <Badge variant="success" className="capitalize">
                      {t("accepted")}
                    </Badge>
                  )}
                  {item.status === "REJECTED" && (
                    <Badge variant="error" className="text-xs">
                      {t("rejected")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {/* Button to share link to accept */}
                  <Button
                    tooltip={t("copy_link_booking_forwarding_request")}
                    color="minimal"
                    onClick={() => {
                      navigator.clipboard.writeText(`${CAL_URL}/booking-forwarding/accept/${item.uuid}`);
                    }}>
                    <Link width={15} height={15} />
                  </Button>
                </TableCell>
                <TableCell>
                  <Button
                    disabled={deleteBookingForwardingMutation.isLoading}
                    color="destructive"
                    onClick={() => {
                      deleteBookingForwardingMutation.mutate({ bookingForwardingUid: item.uuid });
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
                  <p className="text-subtle text-sm">{t("no_forwardings_found")}</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </TableNew>
      </div>
    </>
  );
};

const SetAway = () => {
  const { t } = useLocale();
  const { data: user } = useMeQuery();
  const utils = trpc.useContext();

  const mutation = trpc.viewer.away.useMutation({
    onMutate: async ({ away }) => {
      await utils.viewer.me.cancel();

      const previousValue = utils.viewer.me.getData();

      if (previousValue) {
        utils.viewer.me.setData(undefined, { ...previousValue, away });
      }

      return { previousValue };
    },
    onError: (_, __, context) => {
      if (context?.previousValue) {
        utils.viewer.me.setData(undefined, context.previousValue);
      }

      showToast(t("toggle_away_error"), "error");
    },
    onSettled() {
      utils.viewer.me.invalidate();
    },
  });

  return (
    <>
      <div className="border-subtle mt-6 flex items-center rounded-t-lg border border-b-0 p-6 text-sm">
        <p className="text-default font-cal text-base font-semibold">{t("going_away_title")}</p>
      </div>
      <SectionBottomActions align="start">
        <Button
          EndIcon={() => (
            <Moon className="font-semi mx-2 h-5 w-5 text-white dark:text-black" aria-hidden="true" />
          )}
          onClick={() => {
            mutation.mutate({ away: !user?.away });
          }}>
          {user?.away ? t("set_as_free") : t("set_as_away")}
        </Button>
        {user?.away && (
          // Link to see profile as away
          <div className="mx-2 my-1">
            <a href={`/${user.username}`} target="_blank" className="text-light flex flex-row underline">
              {t("see_profile_as_away")}
            </a>
          </div>
        )}
      </SectionBottomActions>
    </>
  );
};

const OutOfOfficePage = () => {
  const { t } = useLocale();

  const features = [
    {
      icon: <FastForward className="h-5 w-5 text-black dark:text-white" />,
      title: t("forward_request_feature_title"),
      description: t("forward_request_feature_description"),
    },
  ];

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
          <UpgradeTip
            plan="team"
            title={t("request_booking_forwarding_feature")}
            description={t("request_booking_forwarding_feature_description")}
            features={features}
            background="/tips/teams"
            buttons={
              <div className="space-y-2 rtl:space-x-reverse sm:space-x-2">
                <ButtonGroup>
                  <Button
                    color="primary"
                    href="/settings/teams/new"
                    target="_blank"
                    data-testid="create_team_booking_forwarding">
                    {t("create_team")}
                  </Button>
                  <Button color="minimal" href="https://go.cal.com/teams-video" target="_blank">
                    {t("learn_more")}
                  </Button>
                </ButtonGroup>
              </div>
            }>
            <>
              <SetAway />
              <BookingForwardingSection />
              <BookingForwardingList />
            </>
          </UpgradeTip>
        </>
      </ShellMain>
    </>
  );
};

OutOfOfficePage.getLayout = getLayout;
OutOfOfficePage.PageWrapper = PageWrapper;

export default OutOfOfficePage;
