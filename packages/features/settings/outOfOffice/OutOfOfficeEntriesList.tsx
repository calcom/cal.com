"use client";

import { Trans } from "next-i18next";
import { useState } from "react";
import { useFormState } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  EmptyScreen,
  Icon,
  showToast,
  SkeletonText,
  TableBody,
  TableCell,
  TableNew,
  TableRow,
  Tooltip,
} from "@calcom/ui";

import { CreateOrEditOutOfOfficeEntryModal } from "./CreateOrEditOutOfOfficeModal";
import type { BookingRedirectForm } from "./CreateOrEditOutOfOfficeModal";

export const OutOfOfficeEntriesList = () => {
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

  const [currentlyEditingOutOfOfficeEntry, setCurrentlyEditingOutOfOfficeEntry] =
    useState<BookingRedirectForm | null>(null);
  const [openModal, setOpenModal] = useState(false);

  const editOutOfOfficeEntry = (entry: BookingRedirectForm) => {
    setCurrentlyEditingOutOfOfficeEntry(entry);
    setOpenModal(true);
  };

  if (data === null || data?.length === 0 || (data === undefined && !isPending))
    return (
      <EmptyScreen
        className="mt-6"
        headline={t("ooo_empty_title")}
        description={t("ooo_empty_description")}
        customIcon={
          <div className="mt-4 h-[102px]">
            <div className="flex h-full flex-col items-center justify-center p-2 md:mt-0 md:p-0">
              <div className="relative">
                <div className="dark:bg-darkgray-50 absolute -left-3 -top-3 -z-20 h-[70px] w-[70px] -rotate-[24deg] rounded-3xl border-2 border-[#e5e7eb] p-8 opacity-40 dark:opacity-80">
                  <div className="w-12" />
                </div>
                <div className="dark:bg-darkgray-50 absolute -top-3 left-3 -z-10 h-[70px] w-[70px] rotate-[24deg] rounded-3xl border-2 border-[#e5e7eb] p-8 opacity-60 dark:opacity-90">
                  <div className="w-12" />
                </div>
                <div className="dark:bg-darkgray-50 relative z-0 flex h-[70px] w-[70px] items-center justify-center rounded-3xl border-2 border-[#e5e7eb] bg-white">
                  <Icon name="clock" size={28} />
                  <div className="dark:bg-darkgray-50 absolute right-4 top-5 h-[12px] w-[12px] rotate-[56deg] bg-white text-lg font-bold" />
                  <span className="absolute right-4 top-3 font-sans text-sm font-extrabold">z</span>
                </div>
              </div>
            </div>
          </div>
        }
      />
    );
  return (
    <div className="border-subtle mt-6 rounded-lg border">
      <TableNew className="border-0">
        <TableBody>
          {data?.map((item) => (
            <TableRow key={item.id} data-testid={`table-redirect-${item.toUser?.username || "n-a"}`}>
              <TableCell className="flex flex-row justify-between p-4">
                <div className="flex flex-row items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
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
                    {item.notes && (
                      <p className="px-2">
                        <span className="text-subtle">{t("notes")}: </span>
                        <span data-testid={`ooo-entry-note-${item.toUser?.username || "n-a"}`}>
                          {item.notes}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-row items-center gap-x-2">
                  <Tooltip content={t("edit")}>
                    <Button
                      className="self-center rounded-lg border"
                      type="button"
                      color="minimal"
                      variant="icon"
                      data-testid={`ooo-edit-${item.toUser?.username || "n-a"}`}
                      StartIcon="pencil"
                      onClick={() => {
                        const offset = dayjs().utcOffset();
                        const outOfOfficeEntryData: BookingRedirectForm = {
                          uuid: item.uuid,
                          dateRange: {
                            startDate: dayjs(item.start).subtract(offset, "minute").toDate(),
                            endDate: dayjs(item.end).subtract(offset, "minute").startOf("d").toDate(),
                          },
                          offset,
                          toTeamUserId: item.toUserId,
                          reasonId: item.reason?.id ?? 1,
                          notes: item.notes ?? undefined,
                        };
                        editOutOfOfficeEntry(outOfOfficeEntryData);
                      }}
                    />
                  </Tooltip>
                  <Tooltip content={t("delete")}>
                    <Button
                      className="self-center rounded-lg border"
                      type="button"
                      color="minimal"
                      variant="icon"
                      disabled={deleteOutOfOfficeEntryMutation.isPending}
                      StartIcon="trash-2"
                      onClick={() => {
                        deleteOutOfOfficeEntryMutation.mutate({ outOfOfficeUid: item.uuid });
                      }}
                    />
                  </Tooltip>
                </div>
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
      {openModal && (
        <CreateOrEditOutOfOfficeEntryModal
          openModal={openModal}
          closeModal={() => {
            setOpenModal(false);
            setCurrentlyEditingOutOfOfficeEntry(null);
          }}
          currentlyEditingOutOfOfficeEntry={currentlyEditingOutOfOfficeEntry}
        />
      )}
    </div>
  );
};
