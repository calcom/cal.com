"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import { appKeysSchema } from "@calcom/app-store/bigbluebutton/zod";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

export default function BigBlueButtonSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<{ bigBlueButtonUrl: string; bigBlueButtonSecret: string }>({
    resolver: zodResolver(appKeysSchema),
    defaultValues: {
      bigBlueButtonUrl: "https://bbb.example.com/bigbluebutton/api/",
      bigBlueButtonSecret: "",
    },
  });

  const saveKeys = trpc.viewer.apps.saveKeys.useMutation({
    onSuccess: async () => {
      await utils.viewer.apps.listLocal.invalidate();
      showToast("BigBlueButton configuration saved", "success");
      router.push("/apps/installed/conferencing?hl=bigbluebutton");
    },
    onError: (error) => showToast(error.message, "error"),
  });

  return (
    <div className="bg-emphasis flex h-screen">
      <div className="bg-default m-auto w-full max-w-xl rounded p-6 md:p-10">
        <div className="mb-6 flex items-start gap-4">
          <img src="/api/app-store/bigbluebutton/icon.svg" alt="BigBlueButton" className="h-12 w-12" />
          <div>
            <h1 className="text-emphasis text-xl font-semibold">BigBlueButton</h1>
            <p className="text-default mt-1 text-sm">
              Configure your self-hosted BigBlueButton server URL and shared secret.
            </p>
          </div>
        </div>

        <Form
          form={form}
          handleSubmit={(values) =>
            saveKeys.mutate({
              slug: "bigbluebutton",
              type: "bigbluebutton_video",
              dirName: "bigbluebutton",
              keys: values,
            })
          }>
          <fieldset className="stack-y-4" disabled={form.formState.isSubmitting || saveKeys.isPending}>
            <Controller
              name="bigBlueButtonUrl"
              control={form.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Server URL"
                  placeholder="https://bbb.example.com/bigbluebutton/api/"
                  hint="Must be the BBB API base URL and end with a trailing slash."
                />
              )}
            />
            <Controller
              name="bigBlueButtonSecret"
              control={form.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Shared secret"
                  placeholder="your-bbb-shared-secret"
                  type="password"
                />
              )}
            />
          </fieldset>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" color="secondary" onClick={() => router.back()}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting || saveKeys.isPending}>
              {t("save")}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
