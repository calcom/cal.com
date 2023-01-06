import fs from "fs";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import React, { useEffect, useState } from "react";

import { getSlugFromAppName, BaseAppFork, Seed, generateAppFiles, getAppDirPath } from "../core";
import Templates from "../utils/templates";
import Label from "./Label";
import { Message } from "./Message";

export const AppForm = ({
  noDbUpdate,
  template: cliTemplate = "",
  slug = "",
  editMode = false,
}: {
  noDbUpdate?: boolean;
  template?: string;
  slug?: string;
  editMode?: boolean;
}) => {
  cliTemplate = Templates.find((t) => t.value === cliTemplate)?.value || "";
  const [appInputData, setAppInputData] = useState({
    template: cliTemplate,
    appName: "",
    appCategory: "",
    appDescription: "",
    publisherEmail: "",
    publisherName: "",
  });

  const [inputIndex, setInputIndex] = useState(0);
  const [slugFinalized, setSlugFinalized] = useState(false);
  const fields = (
    [
      {
        label: "App Title",
        name: "appName",
        type: "text",
        explainer: "Keep it short and sweet like 'Google Meet'",
        optional: false,
      },
      {
        label: "App Description",
        name: "appDescription",
        type: "text",
        explainer:
          "A detailed description of your app. You can later modify README.mdx to add markdown as well",
        optional: false,
      },
      cliTemplate
        ? null
        : ({
            label: "Choose a Template",
            name: "template",
            type: "select",
            options: Templates,
            optional: false,
          } as const),
      {
        optional: false,
        label: "Category of App",
        name: "appCategory",
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
        explainer: "This is how apps are categorized in App Store.",
      },
      {
        optional: true,
        label: "Publisher Name",
        name: "publisherName",
        type: "text",
        explainer: "Let users know who you are",
        defaultValue: "Your Name",
      },
      {
        optional: true,
        label: "Publisher Email",
        name: "publisherEmail",
        type: "text",
        explainer: "Let users know how they can contact you.",
        defaultValue: "email@example.com",
      },
    ] as const
  ).filter((f) => f);
  const field = fields[inputIndex];
  const fieldLabel = field?.label || "";
  const fieldName = field?.name || "";
  let fieldValue = appInputData[fieldName as keyof typeof appInputData] || "";
  let validationResult = null;
  const { appName, appCategory, appDescription, publisherName, publisherEmail, template } = appInputData;

  const [status, setStatus] = useState<"inProgress" | "done">("inProgress");
  const formCompleted = inputIndex === fields.length;

  if (field?.name === "appCategory") {
    // Use template category as the default category
    fieldValue = Templates.find((t) => t.value === appInputData["template"])?.category || "";
  }

  if (!editMode) {
    slug = getSlugFromAppName(appName);
  }

  useEffect(() => {
    // When all fields have been filled
    (async () => {
      if (formCompleted) {
        await BaseAppFork.create({
          category: appCategory,
          appDescription,
          appName,
          slug,
          publisherName,
          publisherEmail,
          template,
        });

        await Seed.update({ slug, category: appCategory, noDbUpdate });

        await generateAppFiles();

        // FIXME: Even after CLI showing this message, it is stuck doing work before exiting
        // So we ask the user to wait for some time
        setStatus("done");
      }
    })();
  });

  if (!slug && editMode) {
    return <Text>--slug is required</Text>;
  }

  if (formCompleted) {
    return (
      <Box flexDirection="column">
        <Message
          key="progressHeading"
          message={{
            text: editMode
              ? `Editing app with slug ${slug}`
              : `Creating app with name '${appName}' categorized in '${appCategory}'`,
            type: "info",
            showInProgressIndicator: true,
          }}
        />
        <Message message={{ text: progressUpdate, type: "info" }} />
        {status === "done" && (
          <Box flexDirection="column" paddingTop={2} paddingBottom={2}>
            <Text bold italic>
              Just wait for a few seconds for process to exit and then you are good to go. Your App code
              exists at ${getAppDirPath(slug)} <br />
              Tip : Go and change the logo of your app by replacing {getAppDirPath(slug) + "/static/icon.svg"}
            </Text>
            <Text bold italic>
              App Summary:
            </Text>
            <Box flexDirection="column">
              <Box flexDirection="row">
                <Text color="green">Slug: </Text>
                <Text>{slug}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">App URL: </Text>
                <Text>{`http://localhost:3000/apps/${slug}`}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">Name: </Text>
                <Text>{appName}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">Description: </Text>
                <Text>{appDescription}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">Category: </Text>
                <Text>{appCategory}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">Publisher Name: </Text>
                <Text>{publisherName}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">Publisher Email: </Text>
                <Text>{publisherEmail}</Text>
              </Box>
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
  if (!editMode && slug && fs.existsSync(getAppDirPath(slug))) {
    validationResult = {
      text: `App with slug ${slug} already exists. If you want to edit it, use edit command`,
      type: "error",
    };
    if (slugFinalized) {
      return <Message message={validationResult} />;
    }
  }
  const selectedOptionIndex =
    field?.type === "select" && field?.options?.findIndex((o) => o.value === fieldValue);
  return (
    <Box flexDirection="column">
      <Box flexDirection="column">
        <Message
          message={{ text: "\nLet's create your app! Start by providing the information that's asked\n" }}
        />
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
                return (
                  <Box justifyContent="space-between">
                    <Box flexShrink={0} flexGrow={1}>
                      <Text color="blue">{item.value}: </Text>
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
