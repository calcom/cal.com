import React, { FC } from "react";

import Create from "./commandViews/Create";
import Delete from "./commandViews/Delete";
import Edit from "./commandViews/Edit";

export const App: FC<{
  noDbUpdate?: boolean;
  template: string;
  command: "create" | "delete";
  slug?: string;
}> = ({ command, noDbUpdate, template, slug }) => {
  if (command === "create") {
    return <Create template={template} noDbUpdate={noDbUpdate} />;
  }
  if (command === "delete") {
    if (!slug) {
      throw new Error('Slug is required for "delete" command');
    }
    return <Delete slug={slug} noDbUpdate={!!noDbUpdate} />;
  }
  if (command === "edit") {
    return <Edit slug={slug} editMode={true} noDbUpdate={noDbUpdate} />;
  }
  return null;
};

export default App;
