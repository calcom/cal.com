"use client";

import AppNotInstalledMessage from "@calcom/app-store/_components/AppNotInstalledMessage";
import type { ISlackSetupProps } from "@calcom/app-store/slack/pages/setup/_getServerSideProps";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Input } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

function generateBridgeToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function generateWebhookSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

const settingsSchema = z.object({
  access_token: z.string().min(1, "Bot token is required"),
  channel_id: z.string().min(1, "Channel ID is required to receive notifications"),
});

type FormValues = z.infer<typeof settingsSchema>;

export default function SlackSetup(_props: ISlackSetupProps) {
  const router = useRouter();
  const { t } = useLocale();

  const integrations = trpc.viewer.apps.integrations.useQuery({
    variant: "automation",
    appId: "slack",
  });
  const slackCredentials = integrations.data?.items?.find(
    (item: { type: string }) => item.type === "slack_notification"
  );
  const [credentialId] = slackCredentials?.userCredentialIds ?? [];
  const showContent = !!integrations.data && integrations.isSuccess && !!credentialId;

  const [webhookUrl, setWebhookUrl] = React.useState<string | null>(null);
  const [webhookSecret, setWebhookSecret] = React.useState<string | null>(null);

  const saveKeysMutation = trpc.viewer.apps.updateAppCredentials.useMutation({
    onSuccess: (_data, variables) => {
      showToast(t("keys_have_been_saved"), "success");
      const key = variables.key as {
        bridge_token?: string;
        webhook_secret?: string;
      };
      if (key?.bridge_token && typeof window !== "undefined") {
        const base = window.location.origin;
        setWebhookUrl(`${base}/api/integrations/slack/webhook?token=${key.bridge_token}`);
      }
      if (key?.webhook_secret) {
        setWebhookSecret(key.webhook_secret);
      }
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      access_token: "",
      channel_id: "",
    },
  });

  const onSubmit = handleSubmit((data) => {
    const bridgeToken = generateBridgeToken();
    const secret = generateWebhookSecret();
    saveKeysMutation.mutate({
      credentialId,
      key: {
        access_token: data.access_token.trim(),
        channel_id: data.channel_id.trim(),
        bridge_token: bridgeToken,
        webhook_secret: secret,
      },
    });
  });

  if (integrations.isPending) {
    return <div className="absolute z-50 flex h-screen w-full items-center bg-emphasis" />;
  }

  if (!showContent) {
    return <AppNotInstalledMessage slug="slack" />;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-default">
      <div className="w-full max-w-[43em] overflow-auto rounded border border-gray-200 p-4 md:p-10">
        <div className="mb-6 flex items-center gap-2">
          {/* biome-ignore lint/performance/noImgElement: app-store icon, same as other Setup pages */}
          <img className="h-8 w-8" src="/api/app-store/slack/icon.svg" alt="Slack" />
          <h1 className="font-semibold text-2xl">{t("slack_connect_title")}</h1>
        </div>
        <p className="mb-4 text-default text-sm">{t("slack_setup_description")}</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="access_token" className="mb-1 block font-medium text-emphasis text-sm">
              {t("slack_bot_token_label")}
            </label>
            <Input
              {...register("access_token")}
              id="access_token"
              type="password"
              autoComplete="off"
              placeholder="xoxb-..."
              className="w-full"
            />
            {errors.access_token && (
              <p className="mt-1 text-destructive text-sm">{errors.access_token.message}</p>
            )}
            <p className="mt-1 text-muted text-xs">{t("slack_bot_token_hint")}</p>
          </div>
          <div>
            <label htmlFor="channel_id" className="mb-1 block font-medium text-emphasis text-sm">
              {t("slack_channel_id_label")}
            </label>
            <Input
              {...register("channel_id")}
              id="channel_id"
              type="text"
              autoComplete="off"
              placeholder="C01234ABCD"
              className="w-full"
            />
            {errors.channel_id && (
              <p className="mt-1 text-destructive text-sm">{errors.channel_id.message}</p>
            )}
            <p className="mt-1 text-muted text-xs">{t("slack_channel_id_hint")}</p>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" loading={isSubmitting || saveKeysMutation.isPending}>
              {t("save")}
            </Button>
            <Button
              type="button"
              color="secondary"
              onClick={() => router.push("/settings/developer/webhooks")}>
              {t("cancel")}
            </Button>
          </div>
        </form>
        {webhookUrl && (
          <div className="mt-4 space-y-3 rounded border border-subtle p-3">
            <div>
              <p className="mb-1 font-medium text-emphasis text-sm">{t("slack_webhook_url_heading")}</p>
              <p className="mb-2 text-muted text-xs">{t("slack_webhook_url_hint")}</p>
              <code className="block break-all rounded bg-muted px-2 py-1 text-muted text-xs">
                {webhookUrl}
              </code>
            </div>
            {webhookSecret && (
              <div>
                <p className="mb-1 font-medium text-emphasis text-sm">{t("slack_webhook_secret_heading")}</p>
                <p className="mb-2 text-muted text-xs">{t("slack_webhook_secret_hint")}</p>
                <code className="block break-all rounded bg-muted px-2 py-1 text-muted text-xs">
                  {webhookSecret}
                </code>
              </div>
            )}
          </div>
        )}
        {!webhookUrl && <p className="mt-4 text-muted text-xs">{t("slack_configure_webhooks")}</p>}
      </div>
    </div>
  );
}
