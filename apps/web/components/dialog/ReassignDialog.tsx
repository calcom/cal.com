import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useInViewObserver } from "@calcom/lib/hooks/useInViewObserver";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import {
  DialogContent,
  DialogFooter,
  DialogClose,
  ConfirmationDialogContent,
} from "@calcom/ui/components/dialog";
import { TextAreaField, Form, Label, Input } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { RadioAreaGroup as RadioArea } from "@calcom/ui/components/radio";
import { showToast } from "@calcom/ui/components/toast";

enum ReassignType {
  ROUND_ROBIN = "round_robin",
  TEAM_MEMBER = "team_member",
}

type ReassignDialog = {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  teamId: number;
  bookingId: number;
  bookingFromRoutingForm: boolean;
};

type FormValues = {
  reassignType: ReassignType.ROUND_ROBIN | ReassignType.TEAM_MEMBER;
  teamMemberId?: number;
  reassignReason?: string;
};

const formSchema = z.object({
  reassignType: z.nativeEnum(ReassignType),
  teamMemberId: z.number().optional(),
  reassignReason: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 10, {
      message: "Reassign reason must be at least 10 characters long if provided",
    }),
});

interface TeamMemberOption {
  label: string;
  value: number;
  status: string;
}

export const ReassignDialog = ({
  isOpenDialog,
  setIsOpenDialog,
  teamId,
  bookingId,
  bookingFromRoutingForm,
}: ReassignDialog) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [animationParentRef] = useAutoAnimate<HTMLFormElement>({
    duration: 150,
    easing: "ease-in-out",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
    trpc.viewer.teams.getRoundRobinHostsToReassign.useInfiniteQuery(
      {
        bookingId,
        exclude: "fixedHosts",
        limit: 10,
        searchTerm: debouncedSearch,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  const allRows = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) ?? [];
  }, [data]);

  const teamMemberOptions = useMemo(() => {
    return allRows.map((member) => ({
      label: member.name || member.email,
      value: member.id,
      status: member.status,
    })) as TeamMemberOption[];
  }, [allRows]);

  const { ref: observerRef } = useInViewObserver(() => {
    if (hasNextPage && !isFetching) {
      fetchNextPage();
    }
  }, document.querySelector('[role="dialog"]'));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reassignType: bookingFromRoutingForm ? ReassignType.TEAM_MEMBER : ReassignType.ROUND_ROBIN,
    },
  });

  const roundRobinReassignMutation = trpc.viewer.teams.roundRobinReassign.useMutation({
    onSuccess: async (data) => {
      await utils.viewer.bookings.get.invalidate();
      setIsOpenDialog(false);
      showToast(t("booking_reassigned_to_host", { host: data?.reassignedTo.name }), "success");
    },
    onError: async (error) => {
      if (error.message.includes(ErrorCode.NoAvailableUsersFound)) {
        showToast(t("no_available_hosts"), "error");
      } else {
        showToast(t("unexpected_error_try_again"), "error");
      }
    },
  });

  const roundRobinManualReassignMutation = trpc.viewer.teams.roundRobinManualReassign.useMutation({
    onSuccess: async () => {
      await utils.viewer.bookings.get.invalidate();
      setIsOpenDialog(false);
      showToast(t("booking_reassigned"), "success");
    },
    onError: async (error) => {
      if (error.message.includes(ErrorCode.NoAvailableUsersFound)) {
        showToast(t("no_available_hosts"), "error");
      } else {
        showToast(t(error.message), "error");
      }
    },
  });

  const [confirmationModal, setConfirmationModal] = useState<{
    show: boolean;
    membersStatus: "unavailable" | "available" | null;
  }>({
    show: false,
    membersStatus: null,
  });

  const handleSubmit = (values: FormValues) => {
    if (values.reassignType === ReassignType.ROUND_ROBIN) {
      roundRobinReassignMutation.mutate({ teamId, bookingId });
    } else {
      if (values.teamMemberId) {
        const selectedMember = teamMemberOptions?.find((member) => member.value === values.teamMemberId);
        if (selectedMember) {
          setConfirmationModal({
            show: true,
            membersStatus: selectedMember.status as "available" | "unavailable",
          });
        }
      }
    }
  };

  const watchedReassignType = form.watch("reassignType");
  const watchedTeamMemberId = form.watch("teamMemberId");

  return (
    <>
      <Dialog
        open={isOpenDialog}
        onOpenChange={(open) => {
          setIsOpenDialog(open);
        }}>
        <DialogContent
          title={t("reassign_round_robin_host")}
          description={t("reassign_to_another_rr_host")}
          enableOverflow>
          <Form form={form} handleSubmit={handleSubmit} ref={animationParentRef}>
            <RadioArea.Group
              onValueChange={(val) => {
                const reassignType: ReassignType = z.nativeEnum(ReassignType).parse(val);
                form.setValue("reassignType", reassignType);
              }}
              defaultValue={bookingFromRoutingForm ? ReassignType.TEAM_MEMBER : ReassignType.ROUND_ROBIN}
              className="mt-1 flex flex-col gap-4">
              {!bookingFromRoutingForm ? (
                <RadioArea.Item
                  value={ReassignType.ROUND_ROBIN}
                  className="w-full text-sm"
                  classNames={{ container: "w-full" }}
                  disabled={bookingFromRoutingForm}>
                  <strong className="mb-1 block">{t("round_robin")}</strong>
                  <p>{t("round_robin_reassign_description")}</p>
                </RadioArea.Item>
              ) : null}
              <RadioArea.Item
                value={ReassignType.TEAM_MEMBER}
                className="text-sm"
                classNames={{ container: "w-full" }}>
                <strong className="mb-1 block">{t("team_member_round_robin_reassign")}</strong>
                <p>{t("team_member_round_robin_reassign_description")}</p>
              </RadioArea.Item>
            </RadioArea.Group>

            {watchedReassignType === ReassignType.TEAM_MEMBER && (
              <div className="mb-2">
                <Label className="text-emphasis mt-6">{t("select_team_member")}</Label>
                <div className="mt-2">
                  <Input
                    type="text"
                    placeholder={t("search")}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="scroll-bar flex h-[150px] flex-col gap-0.5 overflow-y-scroll rounded-md border p-1">
                    {teamMemberOptions.map((member) => (
                      <label
                        key={member.value}
                        tabIndex={watchedTeamMemberId === member.value ? -1 : 0}
                        role="radio"
                        aria-checked={watchedTeamMemberId === member.value}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            form.setValue("teamMemberId", member.value);
                          }
                        }}
                        className={classNames(
                          "hover:bg-subtle focus:bg-subtle focus:ring-emphasis cursor-pointer items-center justify-between gap-0.5 rounded-sm py-2 outline-none focus:ring focus:ring-2",
                          watchedTeamMemberId === member.value && "bg-subtle"
                        )}>
                        <div className="flex flex-1 items-center space-x-3">
                          <input
                            type="radio"
                            className="hidden"
                            checked={watchedTeamMemberId === member.value}
                            onChange={() => form.setValue("teamMemberId", member.value)}
                          />
                          <div
                            className={classNames(
                              "h-3 w-3 flex-shrink-0 rounded-full",
                              member.status === "unavailable" ? "bg-red-500" : "bg-green-500"
                            )}
                          />
                          <span className="text-emphasis w-full text-sm">{member.label}</span>
                          {watchedTeamMemberId === member.value && (
                            <div className="place-self-end pr-2">
                              <Icon name="check" className="text-emphasis h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                    <div className="text-default text-center" ref={observerRef}>
                      <Button
                        color="minimal"
                        loading={isFetchingNextPage}
                        disabled={!hasNextPage}
                        onClick={() => fetchNextPage()}>
                        {hasNextPage ? t("load_more_results") : t("no_more_results")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <DialogClose />
              <Button
                type="submit"
                data-testid="rejection-confirm"
                loading={roundRobinReassignMutation.isPending || roundRobinManualReassignMutation.isPending}>
                {t("reassign")}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmationModal?.show}
        onOpenChange={(open) => setConfirmationModal({ ...confirmationModal, show: open })}>
        <ConfirmationDialogContent
          variety={confirmationModal?.membersStatus === "unavailable" ? "warning" : "success"}
          title={
            confirmationModal?.membersStatus === "unavailable"
              ? t("confirm_reassign_unavailable")
              : t("confirm_reassign_available")
          }
          confirmBtnText={t("yes_reassign")}
          cancelBtnText={t("cancel")}
          onConfirm={() => {
            const teamMemberId = form.getValues("teamMemberId");
            if (!teamMemberId) {
              return;
            }
            roundRobinManualReassignMutation.mutate({
              bookingId,
              teamMemberId,
              reassignReason: form.getValues("reassignReason"),
            });
            setConfirmationModal({
              show: false,
              membersStatus: null,
            });
          }}>
          <p className="mb-4">
            {confirmationModal?.membersStatus === "unavailable"
              ? t("reassign_unavailable_team_member_description")
              : t("reassign_available_team_member_description")}
          </p>
          <TextAreaField
            name="reassignReason"
            label={t("reassign_reason")}
            onChange={(e) => form.setValue("reassignReason", e.target.value)}
            required={confirmationModal?.membersStatus === "unavailable"}
          />
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
};
