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
          <p className="text-sm font-semibold leading-5">{t("webhook_test")}</p>
          <p className="mb-4 text-sm text-gray-600">{t("test_webhook")}</p>
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
      <div className="space-y-0 rounded-md border border-neutral-200 sm:mx-0">
        <div className="flex justify-between border-b p-4">
          <div className="flex items-center space-x-1">
            <h3 className="self-center text-sm font-semibold leading-4">{t("webhook_response")}</h3>
            {mutation.data && (
              <Badge variant={mutation.data.ok ? "green" : "red"}>
                {mutation.data.ok ? t("passed") : t("failed")}
              </Badge>
            )}
          </div>
        </div>
        <div className="rounded-b-md bg-black p-4 font-mono text-[13px] leading-4 text-white">
          {!mutation.data && <p>{t("no_data_yet")}</p>}
          {mutation.status === "success" && (
            <div className="overflow-x-auto text-white">{JSON.stringify(mutation.data, null, 4)}</div>
          )}
        </div>
      </div>
    </>
  );
}
