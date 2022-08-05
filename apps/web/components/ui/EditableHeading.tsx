import { useState } from "react";

import { Icon } from "@calcom/ui/Icon";

const EditableHeading = ({
  title,
  onChange,
  placeholder = "",
  readOnly = false,
}: {
  title: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const enableEditing = () => !readOnly && setIsEditing(true);
  return (
    <div className="group relative cursor-pointer" onClick={enableEditing}>
      {!isEditing ? (
        <>
          <h1
            style={{ fontSize: 22, letterSpacing: "-0.0009em" }}
            className="inline pl-0 normal-case text-gray-900 focus:text-black group-hover:text-gray-500">
            {title}
          </h1>
          {!readOnly ? (
            <Icon.FiEdit2 className="ml-1 -mt-1 inline h-4 w-4 text-gray-700 group-hover:text-gray-500" />
          ) : null}
        </>
      ) : (
        <div style={{ marginBottom: -11 }}>
          <input
            type="text"
            autoFocus
            style={{ top: -6, fontSize: 22 }}
            required
            className="relative h-10 w-full cursor-pointer border-none bg-transparent pl-0 text-gray-900 hover:text-gray-700 focus:text-black focus:outline-none focus:ring-0"
            placeholder={placeholder}
            defaultValue={title}
            onBlur={(e) => {
              setIsEditing(false);
              onChange && onChange(e.target.value);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default EditableHeading;
