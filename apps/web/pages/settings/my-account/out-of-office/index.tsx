import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell, Text } from "@tremor/react";
import React, { useState } from "react";
import { useForm, useFormState } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { APP_NAME, CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge, Button, DatePicker, Meta, showToast, SkeletonText, TextField } from "@calcom/ui";
import { Link, Trash2 } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

type BookingForwardingForm = {
  startDate: string;
  endDate: string;
  toUsernameOrEmail: string;
};

const BookingForwardingSection = () => {
  const { t } = useLocale();
  const [startDate, setStartDate] = useState(dayjs().subtract(1, "d").toISOString());
  const [endDate, setEndDate] = useState(dayjs().add(1, "d").toISOString());
  const utils = trpc.useContext();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BookingForwardingForm>({
    defaultValues: {
      startDate,
      endDate,
      toUsernameOrEmail: "",
    },
  });

  const { data, isLoading } = trpc.viewer.bookingForwardingList.useQuery();

  const createBookingForwardingMutation = trpc.viewer.bookingForwardingCreate.useMutation({
    onSuccess: () => {
      showToast(t("success_request"), "success");
      utils.viewer.bookingForwardingList.invalidate();
    },
    onError: (error) => {
      showToast(t(error.message), "error");
    },
  });

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

  return (
    <div className="border-subtle rounded-lg rounded-t-none border p-6">
      <form
        onSubmit={handleSubmit((data) => {
          createBookingForwardingMutation.mutate(data);
          setValue("toUsernameOrEmail", "");
        })}>
        {/* Add startDate and end date inputs */}
        <div className="flex flex-row">
          <div className="mt-4">
            <p className="text-emphasis mb-2 block text-sm font-medium">From:</p>
            <DatePicker
              data-testid="start-date"
              date={dayjs(startDate).toDate()}
              minDate={dayjs().subtract(1, "d").toDate()}
              {...register("startDate")}
              onDatesChange={(value) => {
                setStartDate(value.toISOString());
                setValue("startDate", value.toISOString());
              }}
            />
          </div>
          <div className="ml-2 mt-4">
            <p className="text-emphasis mb-2 block text-sm font-medium">To:</p>
            <DatePicker
              data-testid="end-date"
              date={dayjs(endDate).toDate()}
              minDate={dayjs().add(1, "d").toDate()}
              onDatesChange={(value) => {
                setEndDate(value.toISOString());
                setValue("endDate", value.toISOString());
              }}
              {...register("endDate")}
            />
          </div>
        </div>
        <div className="mt-6">
          <TextField
            data-testid="username-or-email"
            className="mt-1 w-48"
            {...register("toUsernameOrEmail")}
            label="Username or email"
            required
          />
        </div>

        {/* Button to send request */}
        <div className="mt-12">
          <Button
            color="primary"
            type="submit"
            disabled={createBookingForwardingMutation.isLoading}
            data-testid="send-request-forwarding">
            {t("send_request")}
          </Button>
        </div>
        <div className="mt-8">
          {/* Table that displays current request and status */}
          <p className="text-sm font-medium">{t("forwarding_list")}</p>
          <Table className="mt-5">
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("from")}</TableHeaderCell>
                <TableHeaderCell>{t("to")}</TableHeaderCell>
                <TableHeaderCell>{t("username")}</TableHeaderCell>
                <TableHeaderCell>{t("status")}</TableHeaderCell>
                <TableHeaderCell>{t("share")}</TableHeaderCell>
                <TableHeaderCell>{t("delete")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{dayjs(item.start).format("YYYY-MM-DD")}</TableCell>
                  <TableCell>
                    <Text>{dayjs(item.end).format("YYYY-MM-DD")}</Text>
                  </TableCell>
                  <TableCell>
                    <Text>{item.toUser?.username}</Text>
                  </TableCell>
                  <TableCell>
                    {item.status === "PENDING" && (
                      <Badge color="yellow" className="text-xs">
                        {t("pending")}
                      </Badge>
                    )}
                    {item.status === "ACCEPTED" && <Badge color="green">{t("accepted")}</Badge>}
                    {item.status === "REJECTED" && (
                      <Badge color="red" className="text-xs">
                        {t("rejected")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {/* Button to share link to accept */}
                    <Button
                      tooltip="Copy link to share it directly with selected user"
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
                  <TableCell>
                    <SkeletonText className="h-8 w-full" />
                  </TableCell>
                  <TableCell>
                    <SkeletonText className="h-8 w-full" />
                  </TableCell>
                  <TableCell>
                    <SkeletonText className="h-8 w-full" />
                  </TableCell>
                  <TableCell>
                    <SkeletonText className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              )}

              {data === undefined ||
                (data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      <p className="text-subtle text-sm">{t("no_forwardings_found")}</p>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </form>
    </div>
  );
};

const OutOfOfficePage = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta
        title={t("out_of_office")}
        description={t("out_of_office_description", { appName: APP_NAME })}
        borderInShellHeader={true}
      />
      <BookingForwardingSection />
    </>
  );
};

OutOfOfficePage.getLayout = getLayout;
OutOfOfficePage.PageWrapper = PageWrapper;

export default OutOfOfficePage;
