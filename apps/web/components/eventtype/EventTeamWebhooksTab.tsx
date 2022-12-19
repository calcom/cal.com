import { EventTypeSetupInfered, FormValues } from "pages/event-types/[type]";
import { useFormContext } from "react-hook-form";

import WebhookListItem from "@calcom/features/webhooks/components/WebhookListItem";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, EmptyScreen, Icon } from "@calcom/ui";

const NewWebhookButton = () => {
  const { t, isLocaleReady } = useLocale();
  return (
    <Button
      color="secondary"
      data-testid="new_webhook"
      StartIcon={Icon.FiPlus}
      onClick={() => console.log("create team webhook")}>
      {t("new_webhook")}
    </Button>
  );
};

export const EventTeamWebhooksTab = ({
  eventType,
  team,
  teamMembers,
  currentUserMembership,
}: Pick<EventTypeSetupInfered, "eventType" | "teamMembers" | "team" | "currentUserMembership">) => {
  const formMethods = useFormContext<FormValues>();
  const { t } = useLocale();

  return (
    <div>
      {team && (
        <div>
          <div>
            <>
              {eventType.webhooks.length ? (
                <>
                  <div className="mt-4 mb-8 rounded-md border">
                    {eventType.webhooks.map((webhook, index) => {
                      return (
                        <WebhookListItem
                          key={webhook.id}
                          webhook={webhook}
                          lastItem={eventType.webhooks.length === index + 1}
                          onEditWebhook={() => console.log("edit")}
                        />
                      );
                    })}
                  </div>
                  <NewWebhookButton />
                </>
              ) : (
                <EmptyScreen
                  Icon={Icon.FiLink}
                  headline={t("create_your_first_webhook")}
                  description={t("create_your_first_team_webhook_description", { appName: APP_NAME })}
                  buttonRaw={<NewWebhookButton />}
                />
              )}
            </>
          </div>
        </div>
      )}
    </div>
  );
};
