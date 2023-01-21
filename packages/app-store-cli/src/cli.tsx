#!/usr/bin/env node
import { render } from "ink";
import meow from "meow";
import React from "react";

import App from "./App";
import { SupportedCommands } from "./types";

const cli = meow(
  `
	Usage
	  $ 'app-store create' or 'app-store create-template' - Creates a new app or template    
    Options
		[--template -t]  Template to use.
    

    $ 'app-store edit' or 'app-store edit-template' - Edit the App  or Template identified by slug
    Options
		[--slug -s]  Slug. This is the name of app dir for apps created with cli.
    

    $ 'app-store delete' or 'app-store delete-template' - Deletes the app or template identified by slug
    Options
		[--slug -s]  Slug. This is the name of app dir for apps created with cli.
`,
  {
    flags: {
      slug: {
        type: "string",
        alias: "s",
      },
      template: {
        type: "string",
        alias: "t",
      },
    },
    allowUnknownFlags: false,
  }
);

if (cli.input.length !== 1) {
  cli.showHelp();
}

const command = cli.input[0] as SupportedCommands;
const supportedCommands = [
  "create",
  "delete",
  "edit",
  "create-template",
  "delete-template",
  "edit-template",
] as const;

if (!supportedCommands.includes(command)) {
  cli.showHelp();
}
let slug;

if (
  command === "delete" ||
  command === "edit" ||
  command === "delete-template" ||
  command === "edit-template"
) {
  slug = cli.flags.slug;
  if (!slug) {
    console.log("--slug is required");
    cli.showHelp(0);
  }
}

render(<App slug={slug} template={cli.flags.template || ""} command={command} />);
