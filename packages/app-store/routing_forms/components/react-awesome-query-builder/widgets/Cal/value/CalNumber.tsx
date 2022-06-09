import React from "react";

import { Input } from "@calcom/ui/form/fields";

export default function CalNumber({ value, setValue }) {
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
      }}></Input>
  );
}
