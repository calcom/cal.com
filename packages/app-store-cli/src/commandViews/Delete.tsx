import React from "react";

import DeleteForm from "../components/DeleteForm";

export default function Delete({ slug }: { slug: string }) {
  return <DeleteForm slug={slug} action="delete" />;
}
