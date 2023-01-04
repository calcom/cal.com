import React from "react";

import { AppForm } from "../components/AppForm";

export default function Create(props: React.ComponentProps<typeof AppForm>) {
  return <AppForm {...props} />;
}
