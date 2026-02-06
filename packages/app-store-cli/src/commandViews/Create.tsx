import type React from "react";
import { AppForm } from "../components/AppCreateUpdateForm";

export default function Create(props: Omit<React.ComponentProps<typeof AppForm>, "action">) {
  return <AppForm action="create" {...props} />;
}
