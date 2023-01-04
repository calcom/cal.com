#!/usr/bin/env node
import { render } from "ink";
import meow from "meow";
import React from "react";

import App from "./App";

const cli = meow(
  `
	Usage
	  $ app-store create - Creates a new app    

    Options
		[--template -t]  Template to use.

    

    $ app-store edit --slug - Edit the App identified by slug
    Options
		[--slug -s]  Slug. This is the name of app dir for apps created with cli.
    


    $ app-store delete --slug - Deletes the app identified by slug
    Options
		[--slug]  Slug. This is the name of app dir for apps created with cli.
`,
  {
    flags: {
      noDbUpdate: {
        type: "boolean",
      },
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

const command = cli.input[0] as "create" | "delete" | "edit";
const supportedCommands = ["create", "delete", "edit"];

if (!supportedCommands.includes(command)) {
  cli.showHelp();
}

let slug = null;

if (command === "delete" || command === "edit") {
  slug = cli.flags.slug;
  if (!slug) {
    console.log("--slug is required");
    cli.showHelp();
  }
}

render(<App slug={slug} template={cli.flags.template} command={command} noDbUpdate={cli.flags.noDbUpdate} />);
