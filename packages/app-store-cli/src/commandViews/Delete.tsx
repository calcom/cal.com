import TextInput from "ink-text-input";
import React, { useEffect, useState } from "react";

import { ImportantText } from "../components/ImportantText";
import { Message } from "../components/Message";
import { BaseAppFork, Seed, generateAppFiles } from "../core";
import { getApp } from "../utils/getApp";

export default function Delete({ noDbUpdate, slug }: { noDbUpdate: boolean; slug: string }) {
  const [confirmedAppSlug, setConfirmedAppSlug] = useState("");
  const [allowDeletion, setAllowDeletion] = useState(false);
  const [state, setState] = useState<{
    done?: boolean;
    text: string | null;
    type?: "info" | "error" | "success";
  }>({
    text: null,
  });
  const app = getApp(slug);

  const progressMsg = (newState: typeof state) => {
    setState({
      ...newState,
      type: "info",
    });
  };

  const errorMsg = (newState: typeof state) => {
    setState({
      ...newState,
      type: "error",
    });
  };

  const successMsg = (newState: typeof state) => {
    setState({
      ...newState,
      type: "success",
    });
  };

  useEffect(() => {
    if (!app) {
      errorMsg({
        text: `App with slug "${slug}" doesn't exist`,
        done: true,
      });
    }
  }, []);

  useEffect(() => {
    if (allowDeletion) {
      (async () => {
        await BaseAppFork.delete({ slug });
        Seed.revert({ slug });
        await generateAppFiles();
        successMsg({ text: `App with slug ${slug} has been deleted`, done: true });
      })();
    }
  }, [allowDeletion, slug]);

  return (
    <>
      {!state.done && (
        <>
          <ImportantText>
            Confirm the slug of the app that you want to delete. Note, that it would cleanup the app
            directory, App table and Credential table
          </ImportantText>
          <TextInput
            value={confirmedAppSlug}
            onSubmit={(value) => {
              if (value === slug) {
                progressMsg({ text: `Deletion started`, done: true });
                setAllowDeletion(true);
              } else {
                errorMsg({ text: `Slug doesn't match - Should have been ${slug}`, done: true });
              }
            }}
            onChange={(val) => {
              setConfirmedAppSlug(val);
            }}
          />
        </>
      )}
      <Message message={state} />
    </>
  );
}
