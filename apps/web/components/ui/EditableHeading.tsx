import classNames from "classnames";
import { useState } from "react";
import type { ControllerRenderProps } from "react-hook-form";

import { FiEdit2 } from "@calcom/ui/components/icon";

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
    <div className="group relative cursor-pointer" onClick={enableEditing}>
      <div className="flex items-center">
        <label className="min-w-8 relative inline-block">
          <span className="whitespace-pre text-xl tracking-normal text-transparent">{value}&nbsp;</span>
          {!isEditing && isReady && (
            <FiEdit2 className=" ml-1 -mt-px inline h-3 w-3  text-gray-500 group-hover:text-gray-500" />
          )}
          <input
            {...passThroughProps}
            type="text"
            value={value}
            required
            className={classNames(
              "absolute top-0 left-0 w-full cursor-pointer border-none bg-transparent p-0 align-top text-xl text-gray-900 hover:text-gray-700 focus:text-black focus:outline-none focus:ring-0"
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
