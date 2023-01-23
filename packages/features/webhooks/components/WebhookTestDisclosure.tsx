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
    <div className="space-y-0 rounded-md border-0 border-neutral-200 bg-white sm:mx-0 md:border">
      <div className="flex justify-between border-b p-4">
        <div className="flex items-center space-x-1">
          <h3 className="font-sm self-center font-medium text-black">{t("webhook_response")}</h3>
          {mutation.data && (
            <Badge variant={mutation.data.ok ? "green" : "red"}>
              {mutation.data.ok ? t("passed") : t("failed")}
            </Badge>
          )}
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
      <div className="p-4">
        {!mutation.data && <em>{t("no_data_yet")}</em>}
        {mutation.status === "success" && (
          <div className="overflow-x-auto  text-gray-900">{JSON.stringify(mutation.data, null, 4)}</div>
        )}
      </div>
    </div>
  );
}
