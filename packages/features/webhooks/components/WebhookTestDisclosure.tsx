import { useWatch } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge, Button, showToast } from "@calcom/ui";
import { FiActivity } from "@calcom/ui/components/icon";

export default function WebhookTestDisclosure() {
  const subscriberUrl: string = useWatch({ name: "subscriberUrl" });
  const payloadTemplate = useWatch({ name: "payloadTemplate" }) || null;
  const { t } = useLocale();
  const mutation = trpc.viewer.webhook.testTrigger.useMutation({
    onError(err) {
      showToast(err.message, "error");
    },
  });

  return (
    <>
      <div className="flex justify-between">
        <div>
          <p className="text-emphasis text-sm font-semibold leading-5">{t("webhook_test")}</p>
          <p className="text-default mb-4 text-sm">{t("test_webhook")}</p>
        </div>
        <Button
          type="button"
          color="secondary"
          disabled={mutation.isLoading || !subscriberUrl}
          StartIcon={FiActivity}
          onClick={() => mutation.mutate({ url: subscriberUrl, type: "PING", payloadTemplate })}>
          {t("ping_test")}
        </Button>
      </div>
      <div className="border-subtle space-y-0 rounded-md border sm:mx-0">
        <div className="flex justify-between border-b p-4">
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
        <div className="text-inverted bg-inverted rounded-b-md p-4 font-mono text-[13px] leading-4">
          {!mutation.data && <p>{t("no_data_yet")}</p>}
          {mutation.status === "success" && (
            <div className="text-inverted overflow-x-auto">{JSON.stringify(mutation.data, null, 4)}</div>
          )}
        </div>
      </div>
    </>
  );
}
