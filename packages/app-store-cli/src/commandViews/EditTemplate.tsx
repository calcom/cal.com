import React from "react";

import { AppForm } from "../components/AppForm";

export default function Edit(props: Omit<React.ComponentProps<typeof AppForm>, "action">) {
  return <AppForm action="edit-template" {...props} />;
}
