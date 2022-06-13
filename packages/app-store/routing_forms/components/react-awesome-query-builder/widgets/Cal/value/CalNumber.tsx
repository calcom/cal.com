import React from "react";

import { Input } from "@calcom/ui/form/fields";

export default function CalNumber({ value, setValue }) {
  return (
    <Input
      type="number"
      className="mt-0"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
      }}></Input>
  );
}
