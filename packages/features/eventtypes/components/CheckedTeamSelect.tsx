import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Props } from "react-select";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar, Button, Dialog, DialogClose, DialogContent, DialogFooter, Label, Select } from "@calcom/ui";
import { X } from "@calcom/ui/components/icon";

export type CheckedSelectOption = {
  avatar: string;
  priority?: number;
  label: string;
  value: string;
  disabled?: boolean;
};

export const CheckedTeamSelect = ({
  options = [],
  value = [],
  ...props
}: Omit<Props<CheckedSelectOption, true>, "value" | "onChange"> & {
  value?: readonly CheckedSelectOption[];
  onChange: (value: readonly CheckedSelectOption[]) => void;
}) => {
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const { t } = useLocale();

  const [animationRef] = useAutoAnimate<HTMLUListElement>();

  return (
    <>
      <Select
        name={props.name}
        placeholder={props.placeholder || t("select")}
        isSearchable={true}
        options={options}
        value={value}
        isMulti
        {...props}
      />
      {/* This class name conditional looks a bit odd but it allows a seemless transition when using autoanimate
       - Slides down from the top instead of just teleporting in from nowhere*/}
      <ul
        className={classNames("mb-4 mt-3 rounded-md", value.length >= 1 && "border-subtle border")}
        ref={animationRef}>
        {value.map((option, index) => (
          <li
            key={option.value}
            className={`flex px-3 py-2 ${index === value.length - 1 ? "" : "border-subtle border-b"}`}>
            <Avatar size="sm" imageSrc={option.avatar} alt={option.label} />
            <p className="text-emphasis my-auto ms-3 text-sm">{option.label}</p>
            <div className="ml-auto flex items-center">
              <Button
                color="minimal"
                onClick={() => setPriorityDialogOpen(true)}
                className="text-subtle mr-4 px-2 text-sm hover:bg-transparent">
                {t(getPriorityText(option.priority))}
              </Button>
              <X
                onClick={() => props.onChange(value.filter((item) => item.value !== option.value))}
                className="my-auto h-4 w-4"
              />
            </div>
          </li>
        ))}
      </ul>
      <PriorityDialog isOpenDialog={priorityDialogOpen} setIsOpenDialog={setPriorityDialogOpen} />
    </>
  );
};

interface IPriiorityDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
}

const PriorityDialog = (props: IPriiorityDialog) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog } = props;

  const setPriority = () => {
    console.log("set prioirty");
  };
  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent title="Set Priority">
        <div className="mb-4">
          <Label>Priority for TeamPro</Label>
          <Select
            defaultValue={2}
            options={[
              { label: "Lowest", value: 0 },
              { label: "Low", value: 1 },
              { label: "Medium", value: 2 },
              { label: "High", value: 3 },
              { label: "Highest", value: 4 },
            ]}
          />
        </div>

        <DialogFooter>
          <DialogClose />
          <Button data-testid="send_request" onClick={setPriority}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const getPriorityText = (priority?: number) => {
  switch (priority) {
    case 0:
      return "lowest";
    case 1:
      return "low";
    case 2:
      return "medium";
    case 3:
      return "high";
    case 4:
      return "highest";
    default:
      return "medium";
  }
};

export default CheckedTeamSelect;
