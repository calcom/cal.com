import classNames from "classnames";
import { useState } from "react";
import type { ControllerRenderProps } from "react-hook-form";

import { Edit2 } from "@calcom/ui/components/icon";

const EditableHeading = function EditableHeading({
  value,
  onChange,
  isReady,
  ...passThroughProps
}: {
  isReady?: boolean;
} & Omit<JSX.IntrinsicElements["input"], "name" | "onChange"> &
  ControllerRenderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const enableEditing = () => setIsEditing(true);
  return (
    <div
      className="group pointer-events-none relative truncate sm:pointer-events-auto"
      onClick={enableEditing}>
      <div className="flex cursor-pointer items-center">
        <label className="min-w-8 relative inline-block">
          <span className="whitespace-pre text-xl tracking-normal text-transparent">{value}&nbsp;</span>
          {!isEditing && isReady && (
            <Edit2 className=" text-subtle group-hover:text-subtle -mt-px ml-1 inline  h-3 w-3" />
          )}
          <input
            {...passThroughProps}
            type="text"
            value={value}
            required
            className={classNames(
              "text-emphasis hover:text-default focus:text-emphasis absolute left-0 top-0 w-full cursor-pointer truncate border-none bg-transparent p-0 align-top text-xl focus:outline-none focus:ring-0"
            )}
            onFocus={(e) => {
              setIsEditing(true);
              passThroughProps.onFocus && passThroughProps.onFocus(e);
            }}
            onBlur={(e) => {
              setIsEditing(false);
              passThroughProps.onBlur && passThroughProps.onBlur(e);
            }}
            onChange={(e) => onChange && onChange(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
};

export default EditableHeading;
