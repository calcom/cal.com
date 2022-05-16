import React from "react";

import { Input } from "@calcom/ui/form/fields";

export default function CalNumber({ value }) {
  return <Input type="number" value={value}></Input>;
}
