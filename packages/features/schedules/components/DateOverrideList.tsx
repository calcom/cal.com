import { useFieldArray } from "react-hook-form";

import { Button, Icon, Tooltip } from "@calcom/ui";
import { DialogTrigger } from "@calcom/ui/Dialog";

import DateOverrideDialog from "./DateOverrideDialog";

const Item = ({ date }: { date: Date }) => {
  return (
    <li className="flex justify-between border-b px-5 py-4 last:border-b-0">
      <div>
        <h3 className="text-sm text-gray-900">
          {new Intl.DateTimeFormat("en-GB", {
            weekday: "short",
            month: "long",
            day: "numeric",
          }).format(date)}
        </h3>
        <p className="text-sm font-normal text-gray-600">Unavailable</p>
      </div>
      <div>
        <DateOverrideDialog
          Trigger={
            <Tooltip content="Edit">
              {/* DialogTrigger>Tooltip>DialogTrigger>Button = <button> DOM and this makes the Tooltip work */}
              <DialogTrigger asChild>
                <Button className="text-gray-700" color="minimal" size="icon" StartIcon={Icon.FiEdit2} />
              </DialogTrigger>
            </Tooltip>
          }
        />
        <Tooltip content="Delete">
          <Button className="text-gray-700" color="warn" size="icon" StartIcon={Icon.FiTrash2} />
        </Tooltip>
      </div>
    </li>
  );
};

const DateOverrideList = () => {
  const items = [];
  return !!items.length && <ul className="rounded border border-gray-200" />;
};

export default DateOverrideList;
