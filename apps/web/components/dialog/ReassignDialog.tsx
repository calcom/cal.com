import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import type { Host } from "@calcom/ee/teams/components/TeamAssignList";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Dialog, DialogClose, DialogContent, DialogFooter, Label, Select } from "@calcom/ui";
import { RadioGroup as RadioArea } from "@calcom/ui";

type ReassignDialog = {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  hosts?: Host[];
  assignedHosts: string[];
};

const MemberReassignStep = ({
  hosts,
  assignedHosts,
  setSelectedHost,
  selectedHost,
}: {
  hosts?: Host[];
  assignedHosts?: string[];
  setSelectedHost: Dispatch<SetStateAction<number>>;
  selectedHost: number;
}) => {
  const hostsToReassign = hosts?.filter(
    (host) => !assignedHosts?.find((assignedHost) => assignedHost === host.user.email && !host.isFixed)
  );

  const hostsToReassignOptions =
    hostsToReassign?.map((host) => {
      return { label: host.user.name || "", value: host.user.id };
    }) || [];

  // only show available hosts, backend work needed

  if (!hostsToReassignOptions) {
    return <div>No available hosts</div>;
  }

  return (
    <div className="py-4">
      <Label>Assign to</Label>
      <Select
        isSearchable={true}
        options={hostsToReassignOptions}
        onChange={(val) => {
          if (val) {
            setSelectedHost(val.value);
          }
        }}
        maxMenuHeight={200}
        defaultValue={hostsToReassignOptions[0]}
        value={hostsToReassignOptions.find((option) => option.value === selectedHost)}
      />
    </div>
  );
};

export const ReassignDialog = ({ isOpenDialog, setIsOpenDialog, hosts, assignedHosts }: ReassignDialog) => {
  const { t } = useLocale();
  const [reassignTarget, setReassignTarget] = useState<"round-robin" | "choose-member">("round-robin");
  const [selectedHost, setSelectedHost] = useState(0);

  return (
    <Dialog
      open={isOpenDialog}
      onOpenChange={(open) => {
        setIsOpenDialog(open);
      }}>
      <DialogContent title="Reassign round-robin host">
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
            <strong className="mb-1">Assign team member</strong>
            <p>Override which team member you want to assign to.</p>
          </RadioArea.Item>
        </RadioArea.Group>
        {reassignTarget === "choose-member" ? (
          <MemberReassignStep
            setSelectedHost={setSelectedHost}
            selectedHost={selectedHost}
            hosts={hosts}
            assignedHosts={assignedHosts}
          />
        ) : (
          <></>
        )}
        <DialogFooter>
          <DialogClose />
          <Button
            data-testid="rejection-confirm"
            onClick={() => {
              if (reassignTarget === "round-robin") {
                //assign to the least recently booked available rr host, backend work needed
              } else {
                // assign to selected host, backend work needed
              }
              setIsOpenDialog(false);
            }}>
            Reassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
