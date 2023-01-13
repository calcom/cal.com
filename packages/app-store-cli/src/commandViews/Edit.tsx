import React from "react";

import { AppForm } from "../components/AppCreateUpdateForm";

export default function Edit(props: Omit<React.ComponentProps<typeof AppForm>, "action">) {
  return <AppForm action="edit" {...props} />;
}
