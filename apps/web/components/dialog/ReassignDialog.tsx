import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { classNames } from "@calcom/lib";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Form,
  Label,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  ConfirmationDialogContent,
  showToast,
  Input,
  Icon,
  RadioGroup as RadioArea,
  TextAreaField,
  ScrollableArea,
} from "@calcom/ui";

type ReassignDialog = {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  teamId: number;
  bookingId: number;
};

type FormValues = {
  reassignType: "round_robin" | "team_member";
  teamMemberId?: number;
  reassignReason?: string;
};

const formSchema = z.object({
  reassignType: z.enum(["round_robin", "team_member"]),
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

export const ReassignDialog = ({ isOpenDialog, setIsOpenDialog, teamId, bookingId }: ReassignDialog) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [animationParentRef] = useAutoAnimate<HTMLFormElement>({
    duration: 150,
    easing: "ease-in-out",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const observerTarget = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetching } =
    trpc.viewer.teams.getRoundRobinHostsToReassign.useInfiniteQuery(
      {
        bookingId,
        exclude: "fixedHosts",
        limit: 10,
        searchTerm: debouncedSearch,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        keepPreviousData: true,
      }
    );

  useEffect(() => {
    const currentTarget = observerTarget.current;
    if (!currentTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetching) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(currentTarget);

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [fetchNextPage, hasNextPage, isFetching]);

  const allRows = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) ?? [];
  }, [data]);

  const teamMemberOptions = useMemo(() => {
    if (!data) {
      return [
        {
          label: "Loading...",
          value: 0,
          status: "unavailable",
        } as TeamMemberOption,
      ];
    }

    return allRows.map((member) => ({
      label: member.name,
      value: member.id,
      status: member.status,
    })) as TeamMemberOption[];
  }, [allRows]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reassignType: "round_robin",
    },
  });

  const roundRobinReassignMutation = trpc.viewer.teams.roundRobinReassign.useMutation({
    onSuccess: async () => {
      await utils.viewer.bookings.get.invalidate();
      setIsOpenDialog(false);
      showToast(t("booking_reassigned"), "success");
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

  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = (values: FormValues) => {
    if (values.reassignType === "round_robin") {
      roundRobinReassignMutation.mutate({ teamId, bookingId });
    } else {
      if (values.teamMemberId) {
        const selectedMember = teamMemberOptions?.find((member) => member.value === values.teamMemberId);
        if (selectedMember && selectedMember.status === "unavailable") {
          setShowConfirmation(true);
        } else {
          roundRobinManualReassignMutation.mutate({
            bookingId,
            teamMemberId: values.teamMemberId,
            reassignReason: values.reassignReason,
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
                form.setValue("reassignType", val as "team_member" | "round_robin");
              }}
              className="mt-1 flex flex-col gap-4">
              <RadioArea.Item
                value="round_robin"
                className="w-full text-sm"
                classNames={{ container: "w-full" }}>
                <strong className="mb-1 block">{t("round_robin")}</strong>
                <p>{t("round_robin_reassign_description")}</p>
              </RadioArea.Item>
              <RadioArea.Item value="team_member" className="text-sm" classNames={{ container: "w-full" }}>
                <strong className="mb-1 block">{t("team_member_round_robin_reassign")}</strong>
                <p>{t("team_member_round_robin_reassign_description")}</p>
              </RadioArea.Item>
            </RadioArea.Group>

            {watchedReassignType === "team_member" && (
              <div className="mb-2">
                <Label className="text-emphasis mt-6">{t("select_team_member")}</Label>
                <div className="mt-2">
                  <Input
                    type="text"
                    placeholder={t("search")}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <ScrollableArea className="h-[150px] rounded-md border">
                    <div className="flex flex-col p-1">
                      {teamMemberOptions.map((member) => (
                        <label
                          key={member.value}
                          tabIndex={0}
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
                      {isFetching && (
                        <div className="ext-center text-sm text-gray-500">{t("loading")}...</div>
                      )}
                      <div ref={observerTarget} className="h-4 w-full" />
                    </div>
                  </ScrollableArea>
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

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <ConfirmationDialogContent
          variety="warning"
          title={t("confirm_reassign_unavailable")}
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
            setShowConfirmation(false);
          }}>
          <p className="mb-4">{t("reassign_unavailable_team_member_description")}</p>
          <TextAreaField
            name="reassignReason"
            label={t("reassign_reason")}
            onChange={(e) => form.setValue("reassignReason", e.target.value)}
            required
          />
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
};
