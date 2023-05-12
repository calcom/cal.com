import fs from "fs";
import { Box, Newline, Text, useApp } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import React, { useEffect, useState } from "react";

import type { AppMeta } from "@calcom/types/App";

import { getSlugFromAppName, BaseAppFork, generateAppFiles, getAppDirPath } from "../core";
import { getApp } from "../utils/getApp";
import Templates from "../utils/templates";
import Label from "./Label";
import { Message } from "./Message";

export const AppForm = ({
  template: cliTemplate = "",
  slug: givenSlug = "",
  action,
}: {
  template?: string;
  slug?: string;
  action: "create" | "edit" | "create-template" | "edit-template";
}) => {
  cliTemplate = Templates.find((t) => t.value === cliTemplate)?.value || "";
  const { exit } = useApp();
  const isTemplate = action === "create-template" || action === "edit-template";
  const isEditAction = action === "edit" || action === "edit-template";
  let initialConfig = {
    template: cliTemplate,
    name: "",
    description: "",
    category: "",
    publisher: "",
    email: "",
  };

  const [app] = useState(() => getApp(givenSlug, isTemplate));

  if ((givenSlug && action === "edit-template") || action === "edit")
    try {
      const config = JSON.parse(
        fs.readFileSync(`${getAppDirPath(givenSlug, isTemplate)}/config.json`).toString()
      ) as AppMeta;
      initialConfig = {
        ...config,
        category: config.categories[0],
        template: config.__template,
      };
    } catch (e) {}

  const fields = [
    {
      label: "App Title",
      name: "name",
      type: "text",
      explainer: "Keep it short and sweet like 'Google Meet'",
      optional: false,
      defaultValue: "",
    },
    {
      label: "App Description",
      name: "description",
      type: "text",
      explainer:
        "A detailed description of your app. You can later modify DESCRIPTION.mdx to add markdown as well",
      optional: false,
      defaultValue: "",
    },
    // You can't edit the base template of an App or Template - You need to start fresh for that.
    cliTemplate || isEditAction
      ? null
      : {
          label: "Choose a base Template",
          name: "template",
          type: "select",
          options: Templates,
          optional: false,
          defaultValue: "",
        },
    {
      optional: false,
      label: "Category of App",
      name: "category",
      type: "select",
      options: [
        { label: "Calendar", value: "calendar" },
        { label: "Video", value: "video" },
        { label: "Payment", value: "payment" },
        { label: "Messaging", value: "messaging" },
        { label: "Web3", value: "web3" },
        { label: "Automation", value: "automation" },
        { label: "Analytics", value: "analytics" },
        { label: "Other", value: "other" },
      ],
      defaultValue: "",
      explainer: "This is how apps are categorized in App Store.",
    },
    {
      optional: true,
      label: "Publisher Name",
      name: "publisher",
      type: "text",
      explainer: "Let users know who you are",
      defaultValue: "Your Name",
    },
    {
      optional: true,
      label: "Publisher Email",
      name: "email",
      type: "text",
      explainer: "Let users know how they can contact you.",
      defaultValue: "email@example.com",
    },
  ].filter((f) => f);
  const [appInputData, setAppInputData] = useState(initialConfig);
  const [inputIndex, setInputIndex] = useState(0);
  const [slugFinalized, setSlugFinalized] = useState(false);

  const field = fields[inputIndex];
  const fieldLabel = field?.label || "";
  const fieldName = field?.name || "";
  let fieldValue = appInputData[fieldName as keyof typeof appInputData] || "";
  let validationResult: Parameters<typeof Message>[0]["message"] | null = null;
  const { name, category, description, publisher, email, template } = appInputData;

  const [status, setStatus] = useState<"inProgress" | "done">("inProgress");
  const formCompleted = inputIndex === fields.length;
  if (field?.name === "appCategory") {
    // Use template category as the default category
    fieldValue = Templates.find((t) => t.value === appInputData["template"])?.category || "";
  }
  const slug = getSlugFromAppName(name) || givenSlug;

  useEffect(() => {
    // When all fields have been filled
    (async () => {
      if (formCompleted) {
        await BaseAppFork.create({
          category,
          description,
          name,
          slug,
          publisher,
          email,
          template,
          editMode: isEditAction,
          isTemplate,
          oldSlug: givenSlug,
        });

        await generateAppFiles();

        // FIXME: Even after CLI showing this message, it is stuck doing work before exiting
        // So we ask the user to wait for some time
        setStatus("done");
      }
    })();
  }, [formCompleted]);

  if (action === "edit" || action === "edit-template") {
    if (!slug) {
      return <Text>--slug is required</Text>;
    }
    if (!app) {
      return (
        <Message
          message={{
            text: `App with slug ${givenSlug} not found`,
            type: "error",
          }}
        />
      );
    }
  }

  if (status === "done") {
    // HACK: This is a hack to exit the process manually because due to some reason cli isn't automatically exiting
    setTimeout(() => {
      exit();
    }, 500);
  }

  if (formCompleted) {
    return (
      <Box flexDirection="column">
        {status !== "done" && (
          <Message
            key="progressHeading"
            message={{
              text: isEditAction
                ? `Editing app with slug ${slug}`
                : `Creating ${
                    action === "create-template" ? "template" : "app"
                  } with name '${name}' categorized in '${category}' using template '${template}'`,
              type: "info",
              showInProgressIndicator: true,
            }}
          />
        )}
        {status === "done" && (
          <Box flexDirection="column" paddingTop={2} paddingBottom={2}>
            <Text bold>
              Just wait for a few seconds for process to exit and then you are good to go. Your{" "}
              {isTemplate ? "Template" : "App"} code exists at {getAppDirPath(slug, isTemplate)}
            </Text>
            <Text>
              Tip : Go and change the logo of your {isTemplate ? "template" : "app"} by replacing{" "}
              {getAppDirPath(slug, isTemplate) + "/static/icon.svg"}
            </Text>
            <Newline />
            <Text bold underline color="blue">
              App Summary:
            </Text>
            <Box flexDirection="column">
              <Box flexDirection="row">
                <Text color="green">Slug: </Text>
                <Text>{slug}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">{isTemplate ? "Template" : "App"} URL: </Text>
                <Text>{`http://localhost:3000/apps/${slug}`}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">Name: </Text>
                <Text>{name}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">Description: </Text>
                <Text>{description}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">Category: </Text>
                <Text>{category}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">Publisher Name: </Text>
                <Text>{publisher}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">Publisher Email: </Text>
                <Text>{email}</Text>
              </Box>
              <Text bold>
                Next Step: Enable the app from http://localhost:3000/settings/admin/apps as admin user (Email:
                admin@example.com, Pass: ADMINadmin2022!)
              </Text>
            </Box>
          </Box>
        )}
        <Text italic color="gray">
          Note: You should not rename app directory manually. Use cli only to do that as it needs to be
          updated in DB as well
        </Text>
      </Box>
    );
  }
  if (slug && slug !== givenSlug && fs.existsSync(getAppDirPath(slug, isTemplate))) {
    validationResult = {
      text: `${
        action === "create" ? "App" : "Template"
      } with slug ${slug} already exists. If you want to edit it, use edit command`,
      type: "error",
    };

    if (slugFinalized) {
      return <Message message={validationResult} />;
    }
  }
  const selectedOptionIndex =
    field?.type === "select" ? field?.options?.findIndex((o) => o.value === fieldValue) : 0;
  return (
    <Box flexDirection="column">
      <Box flexDirection="column">
        {isEditAction ? (
          <Message
            message={{
              text: `\nLet's edit your ${isTemplate ? "Template" : "App"}! We have prefilled the details.\n`,
            }}
          />
        ) : (
          <Message
            message={{
              text: `\nLet's create your ${
                isTemplate ? "Template" : "App"
              }! Start by providing the information that's asked\n`,
            }}
          />
        )}
        <Box>
          <Label>{`${fieldLabel}`}</Label>
          {field?.type == "text" ? (
            <TextInput
              value={fieldValue}
              placeholder={field?.defaultValue}
              onSubmit={(value) => {
                if (!value && !field.optional) {
                  return;
                }
                setSlugFinalized(true);
                setInputIndex((index) => {
                  return index + 1;
                });
              }}
              onChange={(value) => {
                setAppInputData((appInputData) => {
                  return {
                    ...appInputData,
                    [fieldName]: value,
                  };
                });
              }}
            />
          ) : (
            <SelectInput<string>
              items={field?.options}
              itemComponent={(item) => {
                const myItem = item as { value: string; label: string };
                return (
                  <Box justifyContent="space-between">
                    <Box flexShrink={0} flexGrow={1}>
                      <Text color="blue">{myItem.value}: </Text>
                    </Box>
                    <Text>{item.label}</Text>
                  </Box>
                );
              }}
              key={fieldName}
              initialIndex={selectedOptionIndex === -1 ? 0 : selectedOptionIndex}
              onSelect={(item) => {
                setAppInputData((appInputData) => {
                  return {
                    ...appInputData,
                    [fieldName]: item.value,
                  };
                });
                setInputIndex((index) => {
                  return index + 1;
                });
              }}
            />
          )}
        </Box>
        <Box>
          {validationResult ? (
            <Message message={validationResult} />
          ) : (
            <Text color="gray" italic>
              {field?.explainer}
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
};
