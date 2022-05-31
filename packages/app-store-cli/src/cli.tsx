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
      name: {
        type: "string",
      },
    },
    allowUnknownFlags: false,
  }
);

if (cli.input.length !== 1) {
  cli.showHelp();
}

const command = cli.input[0] as "create" | "delete";
if (command !== "create" && command != "delete") {
  cli.showHelp();
}

let appName = null;

if (command === "delete") {
  appName = cli.flags.name;
}
render(<App appName={appName} command={command} noDbUpdate={cli.flags.noDbUpdate} />);
