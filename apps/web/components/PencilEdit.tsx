import { PencilIcon } from "@heroicons/react/solid";
import { useState } from "react";

export default function PencilEdit({ value, onChange, placeholder = "", readOnly }) {
  const [editIcon, setEditIcon] = useState(true);
  const [editValue, setEditValue] = useState(value);
  return (
    <div className="group relative cursor-pointer" onClick={() => setEditIcon(false)}>
      {editIcon ? (
        <>
          <h1
            style={{ fontSize: 22, letterSpacing: "-0.0009em" }}
            className="inline pl-0 text-gray-900 focus:text-black group-hover:text-gray-500">
            {editValue}
          </h1>
          {!readOnly ? (
            <PencilIcon className="ml-1 -mt-1 inline h-4 w-4 text-gray-700 group-hover:text-gray-500" />
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
            defaultValue={editValue}
            onBlur={(e) => {
              setEditIcon(true);
              setEditValue(e.target.value);
              onChange(e.target.value);
            }}
          />
        </div>
      )}
    </div>
  );
}
