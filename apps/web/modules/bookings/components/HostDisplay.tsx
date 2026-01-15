import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";

interface HostDisplayProps {
  name: string | null;
  email?: string | null;
  role: string;
  showBadge?: boolean;
  hideOrganizerName?: boolean;
  hideOrganizerEmail?: boolean;
  testId?: string;
}

export function HostDisplay({
  name,
  email,
  role,
  showBadge = false,
  hideOrganizerName,
  hideOrganizerEmail,
  testId,
}: HostDisplayProps) {
  const { t } = useLocale();

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        {!hideOrganizerName && name && <span data-testid={testId}>{name}</span>}
        <span className="text-default">{role}</span>
        {showBadge && <Badge variant="blue">{t("host")}</Badge>}
      </div>
      {!hideOrganizerEmail && email && (
        <p className="text-default" data-testid={testId ? `${testId}-email` : undefined}>
          {email}
        </p>
      )}
    </div>
  );
}
