#!/usr/bin/env node
import { render } from "ink";
import meow from "meow";
import App from "./App";
import { VALID_CATEGORY_VALUES } from "./constants";
import { BaseAppFork, generateAppFiles, getSlugFromAppName } from "./core";
import type { SupportedCommands } from "./types";
import Templates from "./utils/templates";
import { validateCreateAppFlags } from "./validateCreateAppFlags";

const cli = meow(
  `
	Usage
	  $ 'app-store create' or 'app-store create-template' - Creates a new app or template    
    Options
		[--template -t]  (required in non-interactive mode) Template to use: ${Templates.map((t) => t.value).join(", ")}.
		[--name -n]  (required) App name. Providing --name, --description, --category, and --template activates non-interactive mode.
		[--description -d]  (required) App description.
		[--category -c]  (required) App category: ${VALID_CATEGORY_VALUES.join(", ")}.
		[--publisher -p]  Publisher name (default: "Your Name").
		[--email -e]  Publisher email (default: "email@example.com").
		[--external-link-url]  (required for link-as-an-app template) External link URL.
    

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
      name: {
        type: "string",
        alias: "n",
      },
      description: {
        type: "string",
        alias: "d",
      },
      category: {
        type: "string",
        alias: "c",
      },
      publisher: {
        type: "string",
        alias: "p",
      },
      email: {
        type: "string",
        alias: "e",
      },
      externalLinkUrl: {
        type: "string",
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

const isCreateCommand = command === "create" || command === "create-template";
const { name: appName, description, category, publisher, email, externalLinkUrl } = cli.flags;

if (isCreateCommand && appName && description && category) {
  const templateFlag = cli.flags.template || "";
  const validTemplateValues = Templates.map((t) => t.value);

  const validationError = validateCreateAppFlags({
    template: templateFlag,
    category,
    externalLinkUrl,
    validTemplateValues,
  });

  if (validationError) {
    console.error(validationError);
    process.exit(1);
  }

  const appSlug = getSlugFromAppName(appName);
  const isTemplate = command === "create-template";

  (async () => {
    try {
      await BaseAppFork.create({
        category,
        description,
        name: appName,
        slug: appSlug,
        publisher: publisher || "Your Name",
        email: email || "email@example.com",
        template: templateFlag,
        isTemplate,
        externalLinkUrl,
      });

      await generateAppFiles();

      console.log(`\nApp created successfully!`);
      console.log(`Slug: ${appSlug}`);
      console.log(`App URL: http://localhost:3000/apps/${appSlug}`);
      console.log(`Name: ${appName}`);
      console.log(`Description: ${description}`);
      console.log(`Category: ${category}`);
      if (externalLinkUrl) {
        console.log(`External Link: ${externalLinkUrl}`);
      }
      console.log(
        `\nNext Step: Enable the app from http://localhost:3000/settings/admin/apps as an admin user.`
      );
    } catch (error) {
      console.error("Failed to create app:", error);
      process.exit(1);
    }
  })();
} else {
  render(<App slug={slug} template={cli.flags.template || ""} command={command} />);
}
