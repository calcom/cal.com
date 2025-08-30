import React from "react";

import { AppForm } from "../components/AppCreateUpdateForm";

export default function CreateTemplate(props: Omit<React.ComponentProps<typeof AppForm>, "action">) {
  return <AppForm action="create-template" {...props} />;
}
