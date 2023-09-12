import { Text } from "ink";
import TextInput from "ink-text-input";
import React, { useEffect, useState } from "react";

import { ImportantText } from "../components/ImportantText";
import { Message } from "../components/Message";
import { BaseAppFork, generateAppFiles } from "../core";
import { getApp } from "../utils/getApp";

export default function DeleteForm({ slug, action }: { slug: string; action: "delete" | "delete-template" }) {
  const [confirmedAppSlug, setConfirmedAppSlug] = useState("");
  const [state, setState] = useState<
    | "INITIALIZED"
    | "DELETION_CONFIRMATION_FAILED"
    | "DELETION_CONFIRMATION_SUCCESSFUL"
    | "DELETION_COMPLETED"
    | "APP_NOT_EXISTS"
  >("INITIALIZED");
  const isTemplate = action === "delete-template";
  const app = getApp(slug, isTemplate);
  useEffect(() => {
    if (!app) {
      setState("APP_NOT_EXISTS");
    }
  }, []);

  useEffect(() => {
    if (state === "DELETION_CONFIRMATION_SUCCESSFUL") {
      (async () => {
        await BaseAppFork.delete({ slug, isTemplate });
        await generateAppFiles();
        // successMsg({ text: `App with slug ${slug} has been deleted`, done: true });
        setState("DELETION_COMPLETED");
      })();
    }
  }, [slug, state]);

  if (state === "INITIALIZED") {
    return (
      <>
        <ImportantText>
          Type below the slug of the {isTemplate ? "Template" : "App"} that you want to delete.
        </ImportantText>
        <Text color="gray" italic>
          It would cleanup the app directory and App table and Credential table.
        </Text>
        <TextInput
          value={confirmedAppSlug}
          onSubmit={(value) => {
            if (value === slug) {
              setState("DELETION_CONFIRMATION_SUCCESSFUL");
            } else {
              setState("DELETION_CONFIRMATION_FAILED");
            }
          }}
          onChange={(val) => {
            setConfirmedAppSlug(val);
          }}
        />
      </>
    );
  }
  if (state === "APP_NOT_EXISTS") {
    return (
      <Message
        message={{
          text: `${isTemplate ? "Template" : "App"} with slug ${slug} doesn't exist`,
          type: "error",
        }}
      />
    );
  }
  if (state === "DELETION_CONFIRMATION_SUCCESSFUL") {
    return (
      <Message
        message={{
          text: `Deleting ${isTemplate ? "Template" : "App"}`,
          type: "info",
          showInProgressIndicator: true,
        }}
      />
    );
  }

  if (state === "DELETION_COMPLETED") {
    return (
      <Message
        message={{
          text: `${
            isTemplate ? "Template" : "App"
          } with slug "${slug}" has been deleted. You might need to restart your dev environment`,
          type: "success",
        }}
      />
    );
  }
  if (state === "DELETION_CONFIRMATION_FAILED") {
    return (
      <Message
        message={{
          text: `Slug doesn't match - Should have been ${slug}`,
          type: "error",
        }}
      />
    );
  }
  return null;
}
