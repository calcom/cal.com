import { useState } from "react";
import { z } from "zod";

import TeamAssignList from "@calcom/ee/teams/components/TeamAssignList";
import useReassignMutation from "@calcom/features/bookings/lib/useReassignMutation";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { Button, ConfirmationDialogContent, Dialog, Icon } from "@calcom/ui";
import { RadioGroup as RadioArea } from "@calcom/ui";

type ReassignDialog = {
  bookingId: number;
};

const querySchema = z.object({
  teamId: z.union([z.string().transform((val) => +val), z.number()]),
});

const MemberReassignStep = ({ bookingId }: { bookingId: number }) => {
  const {
    data: { teamId },
  } = useTypedQuery(querySchema);
  return <TeamAssignList bookingId={bookingId} className="mt-3 w-full" teamId={teamId} />;
};

export const ReassignDialog = ({ bookingId }: ReassignDialog) => {
  const { t } = useLocale();
  const [isChooseMemberStepOpened, setIsChooseMemberStepOpened] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<"round-robin" | "choose-member">();

  const reassignMutation = useReassignMutation();

  return (
    <Dialog name="reassign" clearQueryParamsOnClose={["teamId", "assignee"]}>
      <ConfirmationDialogContent
        confirmBtn={isChooseMemberStepOpened ? true : undefined}
        className="w-full"
        onConfirm={(e) => {
          if (reassignTarget === "round-robin") {
            reassignMutation.mutate({
              bookingId,
            });
          }
          if (reassignTarget === "choose-member") {
            setIsChooseMemberStepOpened(true);
            e.preventDefault();
          }
          setReassignTarget(undefined);
        }}
        confirmBtnText={reassignTarget === "choose-member" ? "Choose team member" : "Confirm"}
        title={
          isChooseMemberStepOpened ? (
            <>
              <Button
                size="icon"
                color="minimal"
                onClick={() => {
                  setIsChooseMemberStepOpened(false);
                }}
                StartIcon={Icon.FiArrowLeft}
                aria-label="Go Back"
                className="ltr:mr-2 rtl:ml-2"
              />
              Reassign team member
            </>
          ) : (
            "Reassign booking"
          )
        }>
        {!isChooseMemberStepOpened && (
          <RadioArea.Group className="mt-3 flex flex-col space-y-4">
            <RadioArea.Item
              name="reassign-target"
              className="text-sm"
              checked={reassignTarget === "round-robin"}
              onClick={() => setReassignTarget("round-robin")}>
              <strong className="mb-1">Round-Robin</strong>
              <p>Reassign booking to another available member of your team</p>
            </RadioArea.Item>
            <RadioArea.Item
              name="reassign-target"
              className="text-sm"
              checked={reassignTarget === "choose-member"}
              onClick={() => setReassignTarget("choose-member")}>
              <strong className="mb-1">
                Choose team member <Icon.FiArrowRight className="inline" />
              </strong>
              <p>Override which team member you want to assign to.</p>
            </RadioArea.Item>
          </RadioArea.Group>
        )}
        {isChooseMemberStepOpened && <MemberReassignStep bookingId={bookingId} />}
      </ConfirmationDialogContent>
    </Dialog>
  );
};
