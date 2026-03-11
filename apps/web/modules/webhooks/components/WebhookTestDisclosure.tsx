"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { ZTestTriggerInputSchema } from "@calcom/trpc/server/routers/viewer/webhook/testTrigger.schema";
import { toastManager } from "@coss/ui/components/toast";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Card, CardFrame, CardPanel } from "@coss/ui/components/card";
import { Label } from "@coss/ui/components/label";
import { ActivityIcon } from "lucide-react";
import { useWatch } from "react-hook-form";
import { ZodError } from "zod";
import { WebhookTestHeader } from "../views/webhook-test-header";

export default function WebhookTestDisclosure() {
  const [subscriberUrl, webhookSecret]: [string, string] = useWatch({ name: ["subscriberUrl", "secret"] });
  const payloadTemplate = useWatch({ name: "payloadTemplate" }) || null;
  const { t } = useLocale();
  const mutation = trpc.viewer.webhook.testTrigger.useMutation({
    onError(err) {
      toastManager.add({ title: err.message, type: "error" });
    },
  });

  return (
    <CardFrame>
      <WebhookTestHeader
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={mutation.isPending || !subscriberUrl}
            onClick={() => {
              try {
                ZTestTriggerInputSchema.parse({
                  url: subscriberUrl,
                  secret: webhookSecret,
                  type: "PING",
                  payloadTemplate,
                });
                mutation.mutate({ url: subscriberUrl, secret: webhookSecret, type: "PING", payloadTemplate });
              } catch (error) {
                if (error instanceof ZodError) {
                  const errorMessage = error.errors.map((e) => e.message).join(", ");
                  toastManager.add({ title: errorMessage, type: "error" });
                } else {
                  toastManager.add({ title: t("unexpected_error_try_again"), type: "error" });
                }
              }
            }}>
            <ActivityIcon />
            {t("ping_test")}
          </Button>
        }
      />
      <Card>
        <CardPanel>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 min-h-5">
              <Label render={<div />}>{t("webhook_response")}</Label>
              {mutation.data && (
                <Badge variant={mutation.data.ok ? "success" : "error"}>
                  {mutation.data.ok ? t("passed") : t("failed")}
                </Badge>
              )}
            </div>
            <div className="rounded-lg border p-4 font-mono text-sm">
              {!mutation.data && <p>{t("no_data_yet")}</p>}
              {mutation.status === "success" && mutation.data && (
                <div>
                  <span className="text-muted-foreground">{t("status")}:</span>{" "}
                  <span>{mutation.data.status}</span>
                </div>
              )}
            </div>
          </div>
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
