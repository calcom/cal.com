import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import type { Host } from "@calcom/ee/teams/components/TeamAssignList";
import TeamAssignList from "@calcom/ee/teams/components/TeamAssignList";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui";
import { RadioGroup as RadioArea } from "@calcom/ui";

type ReassignDialog = {
  bookingId: number;
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  teamId: number;
  hosts?: Host[];
  assignedHosts: string[];
};

const MemberReassignStep = ({
  bookingId,
  teamId,
  hosts,
  assignedHosts,
}: {
  bookingId: number;
  teamId: number;
  hosts?: Host[];
  assignedHosts?: string[];
}) => {
  return (
    <TeamAssignList
      bookingId={bookingId}
      className="mt-3 w-full"
      teamId={teamId}
      hosts={hosts}
      assignedHosts={assignedHosts}
    />
  );
};

export const ReassignDialog = ({
  bookingId,
  isOpenDialog,
  setIsOpenDialog,
  teamId,
  hosts,
  assignedHosts,
}: ReassignDialog) => {
  const { t } = useLocale();
  const [isChooseMemberStepOpened, setIsChooseMemberStepOpened] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<"round-robin" | "choose-member">("round-robin");
  return (
    <Dialog
      open={isOpenDialog}
      onOpenChange={(open) => {
        setIsOpenDialog(open);
        setIsChooseMemberStepOpened(open);
      }}>
      <DialogContent title={isChooseMemberStepOpened ? "Reassign team member" : "Reassign booking"}>
        {!isChooseMemberStepOpened ? (
          <RadioArea.Group className="mt-3 flex flex-col space-y-4">
            <RadioArea.Item
              className="text-sm"
              checked={reassignTarget === "round-robin"}
              value="round-robin"
              onClick={() => setReassignTarget("round-robin")}>
              <strong className="mb-1">Round-Robin</strong>
              <p>Reassign booking to another available round-robin host</p>
            </RadioArea.Item>
            <RadioArea.Item
              className="text-sm"
              value="choose-member"
              checked={reassignTarget === "choose-member"}
              onClick={() => setReassignTarget("choose-member")}>
              <strong className="mb-1">Choose team member</strong>
              <p>Override which team member you want to assign to.</p>
            </RadioArea.Item>
          </RadioArea.Group>
        ) : (
          <div className="overflow-y-auto">
            <MemberReassignStep
              bookingId={bookingId}
              teamId={teamId}
              hosts={hosts}
              assignedHosts={assignedHosts}
            />
          </div>
        )}
        <DialogFooter>
          {!isChooseMemberStepOpened ? (
            <DialogClose />
          ) : (
            <Button
              data-testid="rejection-confirm"
              color="secondary"
              onClick={() => {
                setIsChooseMemberStepOpened(false);
              }}>
              Back
            </Button>
          )}
          <Button
            data-testid="rejection-confirm"
            onClick={() => {
              if (reassignTarget === "choose-member") {
                setIsChooseMemberStepOpened(true);
              } else {
                //assign to the least recently booked available rr host, backend work needed
                setIsOpenDialog(false);
              }
            }}>
            {reassignTarget === "choose-member" ? "Choose team member" : "Reassign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
