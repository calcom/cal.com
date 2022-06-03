#!/usr/bin/env node
import { render } from "ink";
import meow from "meow";
import React from "react";

import App from "./CliApp";

const cli = meow(
  `
	Usage
	  $ app-store create/delete/edit - Edit and Delete commands must be used on apps created using cli

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
render(<App slug={slug} command={command} noDbUpdate={cli.flags.noDbUpdate} />);
