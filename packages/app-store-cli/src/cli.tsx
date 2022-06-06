#!/usr/bin/env node
import { render } from "ink";
import meow from "meow";
import React from "react";

import App from "./CliApp";

const cli = meow(
  `
	Usage
	  $ app-store create/delete

	Options
		--noDbUpdate  Don't update DB. Just generate files.
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

if (command === "delete") {
  slug = cli.flags.slug;
}
render(<App slug={slug} command={command} noDbUpdate={cli.flags.noDbUpdate} />);
