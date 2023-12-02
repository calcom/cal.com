import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui";
import { Send } from "@calcom/ui/components/icon";

function RescheduleRequestSentBadge() {
  const { t } = useLocale();
  return (
    <Badge startIcon={Send} size="md" variant="gray" data-testid="request_reschedule_sent">
      {t("reschedule_request_sent")}
    </Badge>
  );
}

export default RescheduleRequestSentBadge;
