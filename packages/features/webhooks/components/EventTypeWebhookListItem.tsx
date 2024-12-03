import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { Badge, Button, Switch, Tooltip } from "@calcom/ui";

type WebhookProps = {
  id: string;
  subscriberUrl: string;
  payloadTemplate: string | null;
  active: boolean;
  eventTriggers: WebhookTriggerEvents[];
  secret: string | null;
  eventTypeId: number | null;
  teamId: number | null;
};

export default function EventTypeWebhookListItem({
  webhook,
  index,
  canEditWebhook = true,
  lastItem,
  onEditWebhook,
  onToggleWebhook,
  onDeleteWebhook,
}: {
  webhook: WebhookProps;
  index: number;
  canEditWebhook?: boolean;
  lastItem: boolean;
  onEditWebhook: (webhook: WebhookProps) => void;
  onToggleWebhook: (updatedWebhook: WebhookProps) => void;
  onDeleteWebhook: () => void;
}) {
  const { t } = useLocale();

  return (
    <div className={classNames("flex w-full justify-between p-4", lastItem ? "" : "border-subtle border-b")}>
      <div className="w-full truncate">
        <div className="flex">
          <Tooltip content={webhook.subscriberUrl}>
            <p className="text-emphasis max-w-[600px] truncate text-sm font-medium">
              {webhook.subscriberUrl}
            </p>
          </Tooltip>
          <Badge variant="gray" className="ml-2">
            {t("readonly")}
          </Badge>
        </div>
        <Tooltip content={t("triggers_when")}>
          <div className="flex w-4/5 flex-wrap">
            {webhook.eventTriggers.map((trigger) => (
              <Badge
                key={trigger}
                className="mt-2.5 basis-1/5 ltr:mr-2 rtl:ml-2"
                variant="gray"
                startIcon="zap">
                {t(`${trigger.toLowerCase()}`)}
              </Badge>
            ))}
          </div>
        </Tooltip>
      </div>

      <div className="ml-2 flex items-center space-x-4">
        {/* Active Toggle */}
        <Switch
          checked={webhook.active}
          data-testid={`webhook-switch-${webhook.id}`}
          disabled={!canEditWebhook}
          onCheckedChange={(active) => {
            onToggleWebhook({ ...webhook, active });
          }}
        />

        {/* Edit Button */}
        <Button
          className="hidden lg:flex"
          color="secondary"
          disabled={!canEditWebhook}
          onClick={() => onEditWebhook(webhook)}
          data-testid={`webhook-edit-button-${webhook.id}`}>
          {t("edit")}
        </Button>

        {/* Delete Button */}
        <Button
          className="hidden lg:flex"
          color="destructive"
          StartIcon="trash"
          variant="icon"
          disabled={!canEditWebhook}
          onClick={() => onDeleteWebhook(webhook)}
        />
      </div>
    </div>
  );
}
