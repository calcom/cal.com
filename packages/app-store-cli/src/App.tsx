import React, { FC } from "react";
import { SupportedCommands } from "src/types";

import Create from "./commandViews/Create";
import CreateTemplate from "./commandViews/Create";
import Delete from "./commandViews/Delete";
import DeleteTemplate from "./commandViews/DeleteTemplate";
import Edit from "./commandViews/Edit";
import EditTemplate from "./commandViews/EditTemplate";

export const App: FC<{
  template: string;
  command: SupportedCommands;
  slug?: string;
}> = ({ command, template, slug }) => {
  if (command === "create") {
    return <Create template={template} />;
  }

  if (command === "edit") {
    return <Edit slug={slug} />;
  }

  if (command === "edit-template") {
    return <EditTemplate slug={slug} />;
  }

  if (command === "delete") {
    if (!slug) {
      throw new Error('Slug is required for "delete" command');
    }
    return <Delete slug={slug} />;
  }

  if (command === "create-template") {
    return <CreateTemplate template={template} />;
  }

  if (command === "delete-template") {
    if (!slug) {
      throw new Error('Slug is required for "delete-template" command');
    }
    return <DeleteTemplate slug={slug} />;
  }

  return null;
};

export default App;
