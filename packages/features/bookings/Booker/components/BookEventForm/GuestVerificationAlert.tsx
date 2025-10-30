import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";

interface GuestVerificationAlertProps {
  guestsRequireVerification: boolean;
  guestsRequiringCount?: number;
  className?: string;
  emailsRequiringVerification?: string[];
}

export const GuestVerificationAlert = ({
  guestsRequireVerification,
  guestsRequiringCount: _guestsRequiringCount,
  className,
  emailsRequiringVerification: _emailsRequiringVerification,
}: GuestVerificationAlertProps) => {
  const { t } = useLocale();

  if (!guestsRequireVerification) {
    return null;
  }

  return (
    <div className={className}>
      <Alert severity="info" message={t("guests_will_require_confirmation")} />
    </div>
  );
};
