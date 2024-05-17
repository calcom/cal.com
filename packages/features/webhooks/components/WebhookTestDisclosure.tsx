import { useWatch } from "react-hook-form";
import { ZodError } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { ZTestTriggerInputSchema } from "@calcom/trpc/server/routers/viewer/webhook/testTrigger.schema";
import { Badge, Button, showToast } from "@calcom/ui";

export default function WebhookTestDisclosure() {
  const [subscriberUrl, webhookSecret]: [string, string] = useWatch({ name: ["subscriberUrl", "secret"] });
  const payloadTemplate = useWatch({ name: "payloadTemplate" }) || null;
  const { t } = useLocale();
  const mutation = trpc.viewer.webhook.testTrigger.useMutation({
    onError(err) {
      showToast(err.message, "error");
    },
  });

  return (
    <>
      <div className="border-subtle flex justify-between rounded-t-lg border p-6">
        <div>
          <p className="text-emphasis text-sm font-semibold leading-5">{t("webhook_test")}</p>
          <p className="text-default text-sm">{t("test_webhook")}</p>
        </div>
        <Button
          type="button"
          color="secondary"
          disabled={mutation.isPending || !subscriberUrl}
          StartIcon="activity"
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
              //this catches invalid subscriberUrl before calling the mutation
              if (error instanceof ZodError) {
                const errorMessage = error.errors.map((e) => e.message).join(", ");
                showToast(errorMessage, "error");
              } else {
                showToast(t("unexpected_error_try_again"), "error");
              }
            }
          }}>
          {t("ping_test")}
        </Button>
      </div>
      <div className="border-subtle space-y-0 rounded-b-lg border border-t-0 px-6 py-8 sm:mx-0">
        <div className="border-subtle flex justify-between rounded-t-lg border p-4">
          <div className="flex items-center space-x-1">
            <h3 className="text-emphasis self-center text-sm font-semibold leading-4">
              {t("webhook_response")}
            </h3>
            {mutation.data && (
              <Badge variant={mutation.data.ok ? "green" : "red"}>
                {mutation.data.ok ? t("passed") : t("failed")}
              </Badge>
            )}
          </div>
        </div>
        <div className="bg-muted border-subtle rounded-b-lg border border-t-0 p-4 font-mono text-[13px] leading-4">
          {!mutation.data && <p>{t("no_data_yet")}</p>}
          {mutation.status === "success" && (
            <div className="overflow-x-auto">{JSON.stringify(mutation.data, null, 4)}</div>
          )}
        </div>
      </div>
    </>
  );
}
