import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { useState } from "react";
import { useWatch } from "react-hook-form";

import classNames from "@calcom/lib/classNames";
import showToast from "@calcom/lib/notification";
import { trpc } from "@calcom/trpc/react";
import Button from "@calcom/ui/Button";
import { Icon } from "@calcom/ui/Icon";
import { InputGroupBox } from "@calcom/ui/form/fields";

import { useLocale } from "@lib/hooks/useLocale";

export default function WebhookTestDisclosure() {
  const subscriberUrl: string = useWatch({ name: "subscriberUrl" });
  const payloadTemplate = useWatch({ name: "payloadTemplate" }) || null;
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const mutation = trpc.useMutation("viewer.webhook.testTrigger", {
    onError(err) {
      showToast(err.message, "error");
    },
  });

  return (
    <Collapsible open={open} onOpenChange={() => setOpen(!open)}>
      <CollapsibleTrigger type="button" className="flex w-full cursor-pointer">
        <Icon.ChevronRight className={`${open ? "rotate-90 transform" : ""} h-5 w-5 text-neutral-500`} />
        <span className="text-sm font-medium text-gray-700">{t("webhook_test")}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <InputGroupBox className="space-y-0 border-0 px-0">
          <div className="flex justify-between bg-gray-50 p-2">
            <h3 className="self-center text-gray-700">{t("webhook_response")}</h3>
            <Button
              type="button"
              color="minimal"
              disabled={mutation.isLoading}
              onClick={() => mutation.mutate({ url: subscriberUrl, type: "PING", payloadTemplate })}>
              {t("ping_test")}
            </Button>
          </div>
          <div className="border-8 border-gray-50 p-2 text-gray-500">
            {!mutation.data && <em>{t("no_data_yet")}</em>}
            {mutation.status === "success" && (
              <>
                <div
                  className={classNames(
                    "ml-auto w-max px-2 py-1 text-xs",
                    mutation.data.ok ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500"
                  )}>
                  {mutation.data.ok ? t("success") : t("failed")}
                </div>
                <pre className="overflow-x-auto">{JSON.stringify(mutation.data, null, 4)}</pre>
              </>
            )}
          </div>
        </InputGroupBox>
      </CollapsibleContent>
    </Collapsible>
  );
}
