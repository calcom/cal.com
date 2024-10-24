import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { components } from "react-select";

import { classNames } from "@calcom/lib";
import { ErrorCode } from "@calcom/lib/errorCodes";
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
  Select,
  RadioGroup as RadioArea,
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
};

export const ReassignDialog = ({ isOpenDialog, setIsOpenDialog, teamId, bookingId }: ReassignDialog) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [animationParentRef] = useAutoAnimate<HTMLFormElement>({
    duration: 150,
    easing: "ease-in-out",
  });
  // Were using legacy list members here because we don't currently have an easy way to paginate a select via infinite scroll
  const teamMembers = trpc.viewer.teams.getRoundRobinHostsToReassign.useQuery({
    bookingId,
    exclude: "fixedHosts",
  });

  const teamMemberOptions = useMemo(() => {
    if (teamMembers.isLoading)
      return [
        {
          label: "Loading...",
          value: 0,
          status: "unavailable",
        },
      ];

    return teamMembers.data?.map((member) => ({
      label: member.name,
      value: member.id,
      status: member.status,
    }));
  }, [teamMembers]);

  const form = useForm<FormValues>({
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
          roundRobinManualReassignMutation.mutate({ bookingId, teamMemberId: values.teamMemberId });
        }
      }
    }
  };

  const watchedReassignType = form.watch("reassignType");

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
          {/* TODO add team member reassignment*/}
          <Form form={form} handleSubmit={handleSubmit} ref={animationParentRef}>
            <RadioArea.Group
              onValueChange={(val) => {
                form.setValue("reassignType", val as "team_member" | "round_robin");
              }}
              className={classNames("mt-1 flex flex-col gap-4")}>
              <RadioArea.Item
                value="round_robin"
                className={classNames("w-full text-sm")}
                classNames={{ container: classNames("w-full") }}>
                <strong className="mb-1 block">{t("round_robin")}</strong>
                <p>{t("round_robin_reassign_description")}</p>
              </RadioArea.Item>
              <RadioArea.Item
                value="team_member"
                className={classNames("text-sm")}
                classNames={{ container: classNames("w-full") }}>
                <strong className="mb-1 block">{t("team_member_round_robin_reassign")}</strong>
                <p>{t("team_member_round_robin_reassign_description")}</p>
              </RadioArea.Item>
            </RadioArea.Group>

            {watchedReassignType === "team_member" && (
              <div className="mb-2">
                <Label className="text-emphasis mt-6">{t("select_team_member")}</Label>
                <Select
                  value={teamMemberOptions?.find((option) => option.value === form.getValues("teamMemberId"))}
                  options={teamMemberOptions}
                  onChange={(event) => {
                    form.setValue("teamMemberId", event?.value);
                  }}
                  components={{
                    Option: ({ children, ...props }) => {
                      const status = props.data?.status;
                      return (
                        <components.Option {...props}>
                          <div className="flex items-center gap-2">
                            <div
                              className={classNames(
                                "h-2 w-2 rounded-full",
                                status === "available" ? "bg-green-500" : "bg-red-500"
                              )}
                            />
                            {children}
                          </div>
                        </components.Option>
                      );
                    },
                  }}
                />
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
            roundRobinManualReassignMutation.mutate({ bookingId, teamMemberId });
            setShowConfirmation(false);
          }}>
          {t("reassign_unavailable_team_member_description")}
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
};
